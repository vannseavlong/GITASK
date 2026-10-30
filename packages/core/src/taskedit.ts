import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { assertTaskFile } from "./taskfile.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { parseFrontmatter } from "./parse.ts";
import { readPeople } from "./people.ts";
import type { Task } from "./types.ts";

/** Fields of a task header that the edit dialog may change. `undefined` = leave alone, `null` = clear. */
export interface TaskPatch {
  /** The `# H1` text: one line, 1-200 characters. */
  title?: string;
  /** `YYYY-MM-DD` (a real date). */
  due?: string | null;
  tier?: "T0" | "T1" | "T2" | "T3" | null;
  /** A person id; the name from `gitask.json` is written (the id itself when the person is not saved). */
  owner?: string | null;
  /** Free text, e.g. `claude session (agent), 2026-10-30`; clearing writes `none`. */
  claimedBy?: string | null;
}

export interface TaskEditOptions {
  /** Commit the change (default true). Ignored when the file is not tracked by git. */
  commit?: boolean;
  /** Commit message template; `{id}`, `{fields}` are replaced. */
  message?: string;
}

export interface TaskEditResult {
  path: string;
  changed: boolean;
  committed: boolean;
}

export const EDIT_TASK_MESSAGE = "task({id}): edit {fields}";
export const MAX_TITLE = 200;
export const MAX_CLAIMED = 120;
export const TIERS = ["T0", "T1", "T2", "T3"] as const;

/** True for `YYYY-MM-DD` that is a real calendar day. */
export function isRealDay(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/;
const oneLine = (v: string, label: string, max: number): string => {
  const t = v.trim();
  if (!t || t.length > max || CONTROL.test(t)) throw new Error(`${label} must be one line of 1-${max} characters`);
  return t;
};
const FIELD_LINE = /^\s*[-*]\s+\*\*[^*:]+:\*\*/;

/** A file as lines that remember their own ending, so a mixed LF/CRLF file keeps every line's ending. */
interface Doc {
  body: string[];
  cr: string[];
}

function toDoc(raw: string): Doc {
  const pieces = raw.split("\n");
  return { body: pieces.map((p) => (p.endsWith("\r") ? p.slice(0, -1) : p)), cr: pieces.map((p) => (p.endsWith("\r") ? "\r" : "")) };
}
const fromDoc = (d: Doc): string => d.body.map((b, i) => b + d.cr[i]).join("\n");

function insertAt(d: Doc, at: number, add: string[]): void {
  const near = d.cr[Math.min(Math.max(at - 1, 0), d.cr.length - 1)] ?? "";
  d.body.splice(at, 0, ...add);
  d.cr.splice(at, 0, ...add.map(() => near));
}

/** Where the header block is: after the frontmatter, up to the first `## ` section (as `parseTask` reads it). */
function bounds(d: Doc): { start: number; stop: number } {
  const fm = parseFrontmatter(fromDoc(d));
  const start = fm ? fm.end + 1 : 0;
  const hit = d.body.findIndex((l, n) => n >= start && /^##\s/.test(l));
  return { start, stop: hit < 0 ? d.body.length : hit };
}

function setTitle(d: Doc, title: string): void {
  const { start } = bounds(d);
  const at = d.body.findIndex((l, n) => n >= start && /^#\s+/.test(l));
  if (at >= 0) d.body[at] = "# " + title;
  else insertAt(d, start, ["# " + title, ""]);
}

/** Set one `- **Name:** value` header line (the last one wins when there are several, like the parser). */
function setField(d: Doc, name: string, value: (old: string | undefined) => string | undefined): void {
  const { start, stop } = bounds(d);
  const re = new RegExp(`^(\\s*[-*]\\s+\\*\\*${name}:\\*\\*)[ \\t]*(.*)$`, "i");
  let at = -1;
  for (let n = start; n < stop; n++) if (re.test(d.body[n])) at = n;
  if (at >= 0) {
    const old = re.exec(d.body[at])![2].trim();
    const next = value(old);
    if (next === undefined) return;
    d.body[at] = d.body[at].replace(re, (_m, head: string) => (next ? `${head} ${next}` : head)); // function replacer: `$&` in `next` stays literal
    return;
  }
  const next = value(undefined);
  if (!next) return;
  const line = `- **${name}:** ${next}`;
  let last = -1;
  for (let n = start; n < stop; n++) if (FIELD_LINE.test(d.body[n])) last = n;
  if (last >= 0) return insertAt(d, last + 1, [line]);
  const title = d.body.findIndex((l, n) => n >= start && n < stop && /^#\s+/.test(l));
  if (title >= 0) return insertAt(d, title + 1, ["", line]);
  insertAt(d, start, [line, ""]);
}

/**
 * Return `content` with the patched header fields and title. Only those lines change (a missing field is inserted
 * after the last header field); every line keeps its own line ending. Throws on a value that is not one clean line.
 * `ownerName` is the text for the `Owner` line when `patch.owner` is set.
 */
export function editTaskText(content: string, patch: TaskPatch, ownerName?: string): string {
  const d = toDoc(content);
  const fields: string[] = [];
  if (patch.title !== undefined) {
    setTitle(d, oneLine(patch.title, "Title", MAX_TITLE));
    fields.push("title");
  }
  if (patch.due !== undefined) {
    if (patch.due !== null && !isRealDay(patch.due)) throw new Error("Due must be a real date, YYYY-MM-DD");
    setField(d, "Due", () => patch.due ?? "");
  }
  if (patch.tier !== undefined) {
    if (patch.tier !== null && !(TIERS as readonly string[]).includes(patch.tier)) throw new Error("Tier must be T0, T1, T2 or T3");
    // "T2 · new feature ..." keeps its explanation; only the tier token changes.
    setField(d, "Tier", (old) => (patch.tier === null ? "" : old && /^T[0-3]\b/.test(old) ? old.replace(/^T[0-3]/, () => patch.tier!) : patch.tier!));
  }
  if (patch.owner !== undefined) {
    const name = patch.owner === null ? "" : oneLine(ownerName ?? patch.owner, "Owner", 100);
    setField(d, "Owner", () => name);
  }
  if (patch.claimedBy !== undefined) {
    const v = patch.claimedBy === null ? "none" : oneLine(patch.claimedBy, "Claimed by", MAX_CLAIMED);
    setField(d, "Claimed by", () => v);
  }
  return fromDoc(d);
}

/**
 * Edit the title and header fields of one task. Never renames the file or changes its id, rewrites only the
 * patched lines, and commits that file by pathspec when it is tracked.
 */
export async function updateTask(task: Task, patch: TaskPatch, opts: TaskEditOptions = {}): Promise<TaskEditResult> {
  const keys = (["title", "due", "tier", "owner", "claimedBy"] as const).filter((k) => patch[k] !== undefined);
  await assertTaskFile(task.path);
  let ownerName: string | undefined;
  if (typeof patch.owner === "string") {
    const people = await readPeople(dirname(dirname(task.path)));
    ownerName = people.find((p) => p.id === patch.owner)?.name ?? patch.owner;
  }
  const raw = await readFile(task.path, "utf8");
  const out = editTaskText(raw, patch, ownerName);
  if (out === raw) return { path: task.path, changed: false, committed: false };
  await writeFile(task.path, out);

  let committed = false;
  const cwd = dirname(task.path);
  const root = await repoRoot(cwd);
  if (root && opts.commit !== false && (await isTracked(cwd, task.path))) {
    const msg = fillTemplate(opts.message ?? EDIT_TASK_MESSAGE, { id: basename(task.path, ".md"), fields: keys.join(", ") });
    await gitAdd(root, task.path);
    await gitCommitPaths(root, msg, task.path);
    committed = true;
  }
  return { path: task.path, changed: true, committed };
}
