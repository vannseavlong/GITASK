import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { assertTaskFile } from "./taskfile.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { isSubtaskSection, parseSubtasks, splitTokens } from "./parse.ts";
import type { Task } from "./types.ts";

export interface SubtaskOptions {
  /** Commit the change (default true). Ignored when the file is not tracked by git. */
  commit?: boolean;
  /** Commit message template; `{id}`, `{text}` are replaced. */
  message?: string;
}

export interface SubtaskResult {
  path: string;
  committed: boolean;
}

export const SUBTASK_MESSAGE = "task({id}): sub-task {text}";

const PERSON = /^[A-Za-z0-9_](?:[\w.-]*\w)?$/;
const LANE = /^[A-Za-z][\w-]*$/;
const HEADING = "## Sub-tasks";

function check(assignee: string | undefined, lane: string | undefined): void {
  if (assignee !== undefined && !PERSON.test(assignee)) throw new Error(`Invalid assignee "${assignee}"`);
  if (lane !== undefined && !LANE.test(lane)) throw new Error(`Invalid lane "${lane}"`);
}

const line = (head: string, text: string, assignee?: string, lane?: string) =>
  [head + text, assignee && `@${assignee}`, lane && `#${lane}`].filter(Boolean).join(" ");

async function commitFile(task: Task, text: string, opts: SubtaskOptions): Promise<boolean> {
  const cwd = dirname(task.path);
  const root = await repoRoot(cwd);
  if (!root || opts.commit === false || !(await isTracked(cwd, task.path))) return false;
  const short = text.length > 60 ? `${text.slice(0, 57)}...` : text;
  const msg = fillTemplate(opts.message ?? SUBTASK_MESSAGE, { id: basename(task.path, ".md"), text: `"${short}"` });
  await gitAdd(root, task.path);
  await gitCommitPaths(root, msg, task.path);
  return true;
}

/** Replace the tokens of one sub-task line. Refuses when the file changed since `task` was read. */
async function retoken(task: Task, index: number, change: { assignee?: string | null; lane?: string | null; text?: string }, opts: SubtaskOptions) {
  const sub = task.subtasks[index];
  if (!sub) throw new Error(`No sub-task ${index} in ${task.id}`);
  if (!isSubtaskSection(sub.section)) throw new Error(`Sub-task ${index} of ${task.id} is not under "${HEADING}"`);
  await assertTaskFile(task.path);
  const raw = await readFile(task.path, "utf8");
  const now = parseSubtasks(raw).find((s) => s.line === sub.line && s.col === sub.col);
  if (!now || now.text !== sub.text || now.checked !== sub.checked || now.assignee !== sub.assignee || now.lane !== sub.lane) {
    throw new Error(`${task.id} changed since it was read; reload and try again`);
  }
  const lines = raw.split("\n");
  const cr = lines[sub.line - 1].endsWith("\r") ? "\r" : "";
  const body = lines[sub.line - 1].slice(0, lines[sub.line - 1].length - cr.length);
  const head = body.slice(0, body.indexOf("]", sub.col) + 1);
  const rest = body.slice(head.length);
  const lead = /^\s*/.exec(rest)![0];
  const { text } = splitTokens(rest);
  const pick = <T>(v: T | null | undefined, old: T | undefined) => (v === undefined ? old : v === null ? undefined : v);
  lines[sub.line - 1] = line(head + (lead || " "), change.text ?? text, pick(change.assignee, sub.assignee), pick(change.lane, sub.lane)) + cr;
  await writeFile(task.path, lines.join("\n"));
  return { path: task.path, committed: await commitFile(task, sub.text, opts) };
}

/** Set (or with `undefined` clear) the `@assignee` token of one sub-task. Only that line changes. */
export async function setSubtaskAssignee(task: Task, index: number, assignee: string | undefined, opts: SubtaskOptions = {}): Promise<SubtaskResult> {
  check(assignee, undefined);
  return retoken(task, index, { assignee: assignee ?? null }, opts);
}

/** Set (or with `undefined` clear) the `#lane` token of one sub-task. Only that line changes. */
export async function setSubtaskLane(task: Task, index: number, lane: string | undefined, opts: SubtaskOptions = {}): Promise<SubtaskResult> {
  check(undefined, lane);
  return retoken(task, index, { lane: lane ?? null }, opts);
}

function cleanText(text: string): string {
  const clean = text.trim();
  if (!clean || /[\u0000-\u001f\u007f\u2028\u2029]/.test(clean)) throw new Error("Sub-task text must be one non-empty line");
  if (/\[[ xX]\]/.test(clean)) throw new Error("Sub-task text must not contain [ ] or [x]");
  if (splitTokens(clean).text !== clean) throw new Error("Sub-task text must not end with @name or #lane; use the assignee and lane fields");
  return clean;
}

/** Change the text, and optionally the assignee and lane (`null` clears), of one sub-task. Only that line changes. */
export async function editSubtask(
  task: Task,
  index: number,
  change: { text?: string; assignee?: string | null; lane?: string | null },
  opts: SubtaskOptions = {},
): Promise<SubtaskResult> {
  check(change.assignee ?? undefined, change.lane ?? undefined);
  const text = change.text === undefined ? undefined : cleanText(change.text);
  return retoken(task, index, { assignee: change.assignee, lane: change.lane, text }, opts);
}

/** Remove exactly the checkbox line of one sub-task. Refuses when the file changed since `task` was read. */
export async function deleteSubtask(task: Task, index: number, opts: SubtaskOptions = {}): Promise<SubtaskResult> {
  const sub = task.subtasks[index];
  if (!sub) throw new Error(`No sub-task ${index} in ${task.id}`);
  await assertTaskFile(task.path);
  const raw = await readFile(task.path, "utf8");
  const all = parseSubtasks(raw);
  const now = all.find((s) => s.line === sub.line && s.col === sub.col);
  if (!now || now.text !== sub.text || now.checked !== sub.checked) throw new Error(`${task.id} changed since it was read; reload and try again`);
  if (all.filter((s) => s.line === sub.line).length > 1) throw new Error("This line holds several checkboxes; edit the file to remove it");
  const lines = raw.split("\n");
  lines.splice(sub.line - 1, 1);
  await writeFile(task.path, lines.join("\n"));
  return { path: task.path, committed: await commitFile(task, sub.text, { ...opts, message: opts.message ?? "task({id}): removed sub-task {text}" }) };
}

/**
 * Append `- [ ] text @assignee #lane` at the end of the `## Sub-tasks` section, creating the section at the end of
 * the file when missing. Everything else, including CRLF line endings, stays as it was.
 */
export async function addSubtask(
  task: Task,
  text: string,
  extra: { assignee?: string; lane?: string } = {},
  opts: SubtaskOptions = {},
): Promise<SubtaskResult & { line: number }> {
  const clean = text.trim();
  if (!clean || /[\r\n]/.test(clean)) throw new Error("Sub-task text must be one non-empty line");
  if (/\[[ xX]\]/.test(clean)) throw new Error("Sub-task text must not contain [ ] or [x]");
  check(extra.assignee, extra.lane);
  const entry = line("- [ ] ", clean, extra.assignee, extra.lane);

  await assertTaskFile(task.path);
  const raw = await readFile(task.path, "utf8");
  // Each line keeps its own ending; a file may mix LF and CRLF.
  const pieces = raw.split("\n");
  const finalNl = pieces[pieces.length - 1] === "";
  if (finalNl) pieces.pop();
  const lines = pieces.map((p, i) => (p.endsWith("\r") && (i < pieces.length - 1 || finalNl) ? p.slice(0, -1) : p));
  const eols = pieces.map((p, i) => (i === pieces.length - 1 && !finalNl ? "" : p.endsWith("\r") ? "\r\n" : "\n"));
  const dominant = eols.find((e) => e) ?? "\n";

  let fence = "";
  let start = -1;
  let end = lines.length; // exclusive end of the section
  const skip = raw.startsWith("---") || raw.startsWith("﻿---") ? frontmatterEnd(lines) + 1 : 0;
  for (let i = skip; i < lines.length; i++) {
    const f = /^\s*(```|~~~)/.exec(lines[i])?.[1];
    if (f) {
      fence = !fence ? f : f === fence ? "" : fence;
      continue;
    }
    if (fence) continue;
    const h = /^##\s+(.*?)\s*#*\s*$/.exec(lines[i]);
    if (!h) continue;
    if (start >= 0) {
      end = i;
      break;
    }
    if (isSubtaskSection(h[1])) start = i;
  }

  // Insert new lines after index `after`; they take the ending of the line before them.
  const insert = (after: number, add: string[], keepNoFinalNl: boolean) => {
    const wasLast = after === lines.length - 1;
    const eol = eols[after] || dominant;
    if (eols[after] === "") eols[after] = eol; // the old last line now needs a terminator
    lines.splice(after + 1, 0, ...add);
    eols.splice(after + 1, 0, ...add.map(() => eol));
    if (wasLast && !finalNl && keepNoFinalNl) eols[eols.length - 1] = "";
  };

  let at: number;
  if (start < 0) {
    const tailBlank = lines.length && lines[lines.length - 1].trim();
    insert(lines.length - 1, tailBlank ? ["", HEADING, "", entry] : [HEADING, "", entry], false);
    at = lines.length;
  } else {
    let last = end - 1;
    while (last > start && !lines[last].trim()) last--;
    if (last === start) (insert(start, ["", entry], true), (at = start + 3));
    else (insert(last, [entry], true), (at = last + 2));
  }
  await writeFile(task.path, lines.map((l, i) => l + eols[i]).join(""));
  return { path: task.path, committed: await commitFile(task, clean, opts), line: at };
}

function frontmatterEnd(lines: string[]): number {
  const end = lines.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
  return end < 0 ? -1 : end;
}
