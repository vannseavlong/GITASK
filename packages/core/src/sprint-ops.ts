// Sprint writes: create, edit, start, task membership and estimate, and closing a sprint.
// Every write commits by pathspec only (never `git add -A`); see Docs/architecture/sprints.md.
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { columnLabel, loadBoard } from "./board.ts";
import { localDate } from "./date.ts";
import { gitAdd, gitCommitPaths, gitMv, gitUnstage, isTracked, repoRoot } from "./git.ts";
import { bumpUpdated } from "./move.ts";
import { MAX_ESTIMATE, SPRINT_ID_RE, parseEstimate, parseSprintRef } from "./parse.ts";
import { cleanText } from "./project-rules.ts";
import { MAX_SPRINT_GOAL, MAX_SPRINT_NAME, SPRINTS_DIR, UNFINISHED_ACTIONS, nextSprintId, parseSprint, readSprintConfig, readSprints } from "./sprints.ts";
import { assertRegularFile, assertTaskFile } from "./taskfile.ts";
import { editHeaderField, editTaskText, isRealDay, removeHeaderField } from "./taskedit.ts";
import { fillTemplate } from "./template.ts";
import type { Board, Sprint, SprintConfig, Task, UnfinishedAction } from "./types.ts";

export interface SprintOpsOptions {
  /** Commit the change (default true). Files that are not tracked by git are written but never committed. */
  commit?: boolean;
  /** `YYYY-MM-DD` used as today (Start on start, `Started / updated` on a move, `Closed` in the summary). */
  today?: string;
}

/** Editable sprint fields. `undefined` = leave alone, `null` = remove the line. */
export interface SprintPatch {
  /** The `# heading`: one line, 1-80 characters. */
  name?: string;
  /** One line, 1-200 characters. */
  goal?: string | null;
  /** Real `YYYY-MM-DD`; `end` may not be before `start`. */
  start?: string | null;
  end?: string | null;
  /** Number >= 0, at most 2 decimals, at most 10000. */
  capacity?: number | null;
}

export interface SprintWriteResult {
  sprint: Sprint;
  changed: boolean;
  committed: boolean;
}

export interface TaskHeaderResult {
  path: string;
  changed: boolean;
  committed: boolean;
}

export const SPRINT_CREATE_MESSAGE = "sprint({id}): create";
export const SPRINT_EDIT_MESSAGE = "sprint({id}): edit {fields}";
export const SPRINT_START_MESSAGE = "sprint({id}): start";
export const TASK_SPRINT_MESSAGE = "task({id}): sprint {sprint}";
export const TASK_ESTIMATE_MESSAGE = "task({id}): estimate {estimate}";
export const SPRINT_COMPLETE_MESSAGE = "sprint({id}): complete, {done} done, {backlog} to backlog, {next} to {nextId}";
export const BACKLOG_COLUMN = "1-backlog";

// ---------- small helpers ----------

/** `day` + `n` days, both `YYYY-MM-DD`. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** End date of a sprint of `lengthDays` days that starts on `start` (inclusive: 14 days from Nov 16 ends Nov 29). */
export const sprintEnd = (start: string, lengthDays: number): string => addDays(start, lengthDays - 1);

const checkDay = (v: string, label: string): string => {
  if (typeof v !== "string" || !isRealDay(v)) throw new Error(`${label} must be a real date, YYYY-MM-DD`);
  return v;
};

/** An estimate or capacity as written in a header (`3`, `0.5`); throws unless it reads back as the same number. */
export function formatEstimate(n: unknown, label = "Estimate"): string {
  const text = typeof n === "number" && Number.isFinite(n) ? String(n) : "";
  if (parseEstimate(text) !== n) throw new Error(`${label} must be a number from 0 to ${MAX_ESTIMATE} with at most 2 decimals`);
  return text;
}

const HEADER_CHECKBOX = /(^|\s)[-*]\s+\[[ xX]\]/;
function oneLine(v: unknown, max: number, label: string): string {
  const t = cleanText(v, max, label, true);
  if (!t) throw new Error(`${label} must not be empty`);
  if (HEADER_CHECKBOX.test(t)) throw new Error(`${label} must not contain checkbox syntax`);
  return t;
}

function checkSprintId(id: unknown): string {
  if (typeof id !== "string" || !SPRINT_ID_RE.test(id)) throw new Error(`Not a sprint id: ${String(id)}`);
  return id;
}

async function requireConfig(dir: string): Promise<SprintConfig> {
  const config = await readSprintConfig(dir);
  if (!config) throw new Error('Sprints are off: add a "sprint" block to Tasks/gitask.json');
  return config;
}

const sprintPath = (dir: string, id: string): string => join(dir, SPRINTS_DIR, `${id}.md`);

/** The `_sprints` folder, created when missing; refused when it is a symlink or not a folder. */
async function sprintsFolder(dir: string): Promise<string> {
  const folder = join(dir, SPRINTS_DIR);
  const st = await lstat(folder).catch(() => undefined);
  if (st && (st.isSymbolicLink() || !st.isDirectory())) throw new Error(`${SPRINTS_DIR} is not a folder`);
  if (!st) await mkdir(folder);
  return folder;
}

/** Read one sprint file (symlink and size guards). */
async function readSprintFile(dir: string, id: string): Promise<{ path: string; raw: string; sprint: Sprint }> {
  const path = sprintPath(dir, checkSprintId(id));
  try {
    await assertRegularFile(path, dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Sprint ${id} does not exist`);
    throw e;
  }
  const raw = await readFile(path, "utf8");
  return { path, raw, sprint: parseSprint(path, raw)! };
}

/** Commit `paths` when inside a repo, `commit` is on and `tracked` holds (new files are added first). */
async function commitPaths(cwd: string, message: string, paths: string[], opts: SprintOpsOptions): Promise<boolean> {
  if (opts.commit === false || !paths.length) return false;
  const root = await repoRoot(cwd);
  if (!root) return false;
  await gitAdd(root, ...paths);
  await gitCommitPaths(root, message, ...paths);
  return true;
}

/** Build the text of a new sprint file. */
export function sprintFileText(id: string, name: string, fields: { state: string; start?: string; end?: string; goal?: string; capacity?: string }): string {
  const lines = [`# ${name}`, `- **ID:** ${id}`, `- **State:** ${fields.state}`];
  if (fields.start) lines.push(`- **Start:** ${fields.start}`);
  if (fields.end) lines.push(`- **End:** ${fields.end}`);
  if (fields.goal) lines.push(`- **Goal:** ${fields.goal}`);
  if (fields.capacity) lines.push(`- **Capacity:** ${fields.capacity}`);
  return lines.join("\n") + "\n\n## Review\n\n## Retro\n";
}

async function writeNewSprint(dir: string, id: string, text: string): Promise<string> {
  await sprintsFolder(dir);
  const path = sprintPath(dir, id);
  try {
    await writeFile(path, text, { flag: "wx" }); // never overwrites, never follows a planted link
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Sprint ${id} already exists`);
    throw e;
  }
  return path;
}

// ---------- create / edit / start ----------

/**
 * Create `Tasks/_sprints/S<n>.md` (next free id) as `planned`. With `start` and no `end`, End is Start + `lengthDays` - 1.
 * Without dates they are set by `startSprint`. Commits the new file when inside a repo.
 */
export async function createSprint(dir: string, input: SprintPatch = {}, opts: SprintOpsOptions = {}): Promise<SprintWriteResult> {
  const config = await requireConfig(dir);
  const id = nextSprintId(await readSprints(dir));
  const number = Number(id.slice(1));
  const name = input.name === undefined ? `Sprint ${number}` : oneLine(input.name, MAX_SPRINT_NAME, "Name");
  const goal = input.goal == null ? undefined : oneLine(input.goal, MAX_SPRINT_GOAL, "Goal");
  const start = input.start == null ? undefined : checkDay(input.start, "Start");
  let end = input.end == null ? undefined : checkDay(input.end, "End");
  if (start && !end) end = sprintEnd(start, config.lengthDays);
  if (start && end && end < start) throw new Error("End must not be before Start");
  const capacity = input.capacity == null ? undefined : formatEstimate(input.capacity, "Capacity");
  const path = await writeNewSprint(dir, id, sprintFileText(id, name, { state: "planned", start, end, goal, capacity }));
  let committed = false;
  try {
    committed = await commitPaths(dir, fillTemplate(SPRINT_CREATE_MESSAGE, { id }), [path], opts);
  } catch (e) {
    const root = await repoRoot(dir);
    if (root) await gitUnstage(root, path).catch(() => undefined);
    await unlink(path).catch(() => undefined);
    throw e;
  }
  return { sprint: parseSprint(path, await readFile(path, "utf8"))!, changed: true, committed };
}

/** Apply a patch to sprint text (pure); returns the new text and the names of the changed fields. */
export function editSprintText(raw: string, patch: SprintPatch, current: Sprint): { text: string; fields: string[] } {
  let text = raw;
  const fields: string[] = [];
  if (patch.name !== undefined) {
    text = editTaskText(text, { title: oneLine(patch.name, MAX_SPRINT_NAME, "Name") });
    fields.push("name");
  }
  const set = (key: string, name: string, value: string | null) => {
    text = value === null ? removeHeaderField(text, name) : editHeaderField(text, name, value);
    fields.push(key);
  };
  if (patch.goal !== undefined) set("goal", "Goal", patch.goal === null ? null : oneLine(patch.goal, MAX_SPRINT_GOAL, "Goal"));
  const start = patch.start === undefined ? current.start : patch.start === null ? undefined : checkDay(patch.start, "Start");
  const end = patch.end === undefined ? current.end : patch.end === null ? undefined : checkDay(patch.end, "End");
  if (start && end && end < start) throw new Error("End must not be before Start");
  if (patch.start !== undefined) set("start", "Start", patch.start);
  if (patch.end !== undefined) set("end", "End", patch.end);
  if (patch.capacity !== undefined) set("capacity", "Capacity", patch.capacity === null ? null : formatEstimate(patch.capacity, "Capacity"));
  return { text, fields };
}

/** Edit name, goal, dates or capacity of a sprint (not its state). Commits the sprint file when it is tracked. */
export async function updateSprint(dir: string, id: string, patch: SprintPatch, opts: SprintOpsOptions = {}): Promise<SprintWriteResult> {
  await requireConfig(dir);
  if (typeof patch !== "object" || patch === null) throw new Error("patch must be an object");
  for (const k of Object.keys(patch)) if (!["name", "goal", "start", "end", "capacity"].includes(k)) throw new Error(`Unknown sprint field: ${k}`);
  const { path, raw, sprint } = await readSprintFile(dir, id);
  const { text, fields } = editSprintText(raw, patch, sprint);
  if (text === raw) return { sprint, changed: false, committed: false };
  return writeSprint(dir, path, raw, text, fillTemplate(SPRINT_EDIT_MESSAGE, { id: sprint.id, fields: fields.join(", ") }), opts);
}

/** Write an existing sprint file and commit it when tracked; the old text is put back when the commit fails. */
async function writeSprint(dir: string, path: string, raw: string, text: string, message: string, opts: SprintOpsOptions): Promise<SprintWriteResult> {
  const tracked = await isTracked(dir, path);
  await writeFile(path, text);
  let committed = false;
  try {
    committed = tracked && (await commitPaths(dir, message, [path], opts));
  } catch (e) {
    const root = await repoRoot(dir);
    if (root) await gitUnstage(root, path).catch(() => undefined);
    await writeFile(path, raw).catch(() => undefined);
    throw e;
  }
  return { sprint: parseSprint(path, text)!, changed: true, committed };
}

/**
 * Start a planned sprint: `State: active`, Start = today and End = Start + `lengthDays` - 1 when empty.
 * Refused when the sprint is not planned or another sprint is active.
 */
export async function startSprint(dir: string, id: string, opts: SprintOpsOptions = {}): Promise<SprintWriteResult> {
  const config = await requireConfig(dir);
  const { path, raw, sprint } = await readSprintFile(dir, id);
  if (sprint.state !== "planned") throw new Error(`Sprint ${sprint.id} is ${sprint.state}; only a planned sprint can start`);
  const other = (await readSprints(dir)).find((s) => s.state === "active" && s.id !== sprint.id);
  if (other) throw new Error(`Sprint ${other.id} is active; complete it before starting ${sprint.id}`);
  const start = sprint.start ?? checkDay(opts.today ?? localDate(), "Today");
  let end = sprint.end ?? sprintEnd(start, config.lengthDays);
  if (end < start) end = sprintEnd(start, config.lengthDays);
  let text = editHeaderField(raw, "State", "active");
  if (!sprint.start) text = editHeaderField(text, "Start", start);
  if (sprint.end !== end) text = editHeaderField(text, "End", end);
  return writeSprint(dir, path, raw, text, fillTemplate(SPRINT_START_MESSAGE, { id: sprint.id }), opts);
}

// ---------- task headers ----------

async function writeTaskHeader(task: Task, edit: (raw: string) => string, message: string, opts: SprintOpsOptions): Promise<TaskHeaderResult> {
  await assertTaskFile(task.path);
  const raw = await readFile(task.path, "utf8");
  const out = edit(raw);
  if (out === raw) return { path: task.path, changed: false, committed: false };
  const cwd = dirname(task.path);
  const tracked = await isTracked(cwd, task.path);
  await writeFile(task.path, out);
  let committed = false;
  try {
    committed = tracked && (await commitPaths(cwd, message, [task.path], opts));
  } catch (e) {
    const root = await repoRoot(cwd);
    if (root) await gitUnstage(root, task.path).catch(() => undefined);
    await writeFile(task.path, raw).catch(() => undefined);
    throw e;
  }
  return { path: task.path, changed: true, committed };
}

/**
 * Put a task into sprint `id` (sets `- **Sprint:** S7`, inserted after the last header line when missing) or, with
 * `null`, back into the backlog (removes the line). The sprint must exist and not be closed. Commits that file when tracked.
 */
export async function setTaskSprint(task: Task, id: string | null, opts: SprintOpsOptions = {}): Promise<TaskHeaderResult> {
  const dir = dirname(dirname(task.path));
  await requireConfig(dir);
  if (id !== null) {
    const { sprint } = await readSprintFile(dir, id);
    if (sprint.state === "closed") throw new Error(`Sprint ${sprint.id} is closed`);
  }
  const msg = fillTemplate(TASK_SPRINT_MESSAGE, { id: task.id, sprint: id ?? "none" });
  return writeTaskHeader(task, (raw) => (id === null ? removeHeaderField(raw, "Sprint") : editHeaderField(raw, "Sprint", id)), msg, opts);
}

/** Set (`- **Estimate:** 3`) or, with `null`, remove a task's estimate. Commits that file when tracked. */
export async function setEstimate(task: Task, value: number | null, opts: SprintOpsOptions = {}): Promise<TaskHeaderResult> {
  const text = value === null ? null : formatEstimate(value);
  const msg = fillTemplate(TASK_ESTIMATE_MESSAGE, { id: task.id, estimate: text ?? "none" });
  return writeTaskHeader(task, (raw) => (text === null ? removeHeaderField(raw, "Estimate") : editHeaderField(raw, "Estimate", text)), msg, opts);
}

// ---------- close ----------

/** What the caller sends to plan or apply a close (a `SprintClosePlan` is one too). Unlisted tasks get the config default. */
export interface SprintCloseRequest {
  id: string;
  /** Action per unfinished task, keyed by task path. */
  actions?: Record<string, UnfinishedAction>;
  /** Column carried-over tasks move to; `null` keeps their status; `undefined` uses the config value. */
  resetStatus?: string | null;
}

export interface CloseTask {
  id: string;
  /** `T-0001` when the task has one, else the file id; used in the summary. */
  label: string;
  path: string;
  column: string;
  estimate?: number;
}

export interface CloseUnfinished extends CloseTask {
  action: UnfinishedAction;
  /** Column the task ends up in (its own when it does not move). */
  to: string;
  /** Path after the close (same as `path` when it does not move). */
  toPath: string;
  claimedBy?: string;
  worktree?: string;
}

export interface CloseSummary {
  committed: { tasks: number; points: number };
  done: { tasks: number; points: number };
  toBacklog: string[];
  toNext: string[];
}

export interface SprintClosePlan {
  id: string;
  /** The sprint carried-over tasks join: `S<n+1>`. */
  next: string;
  /** True when `next` does not exist yet and the close creates it (only when a task goes to it). */
  createNext: boolean;
  /** Resolved: the column carried-over tasks move to, or `null` to keep their status. */
  resetStatus: string | null;
  /** Resolved action of every unfinished task, by path. */
  actions: Record<string, UnfinishedAction>;
  /** Tasks in a done column: never moved or edited. */
  done: CloseTask[];
  unfinished: CloseUnfinished[];
  summary: CloseSummary;
  /** Reasons the close cannot be applied (not active, name clash, missing column...). Empty when it can. */
  blockers: string[];
  /** Things to show before confirming (claimed tasks, the next sprint will be created, a fallback). */
  warnings: string[];
  /** sha256 of what the close will do; `applySprintClose` refuses when the board gives another one. */
  planHash: string;
}

const sum = (list: CloseTask[]) => Math.round(list.reduce((s, t) => s + (t.estimate ?? 0), 0) * 100) / 100;
const isNone = (v: string | undefined) => !v || /^none$/i.test(v.trim());

/**
 * Plan closing sprint `id` from a loaded board (pure; reads nothing). Done tasks are the sprint's tasks in a
 * `doneColumns` column; every other task of the sprint is unfinished and gets its action from `actions[path]` or the
 * config default. Throws on bad input (sprints off, unknown sprint, bad action or resetStatus value); problems with the
 * board go into `blockers`.
 */
export function planSprintClose(board: Board, id: string, actions: Record<string, UnfinishedAction> = {}, resetStatus?: string | null): SprintClosePlan {
  const sprints = board.sprints;
  if (!sprints) throw new Error('Sprints are off: add a "sprint" block to Tasks/gitask.json');
  checkSprintId(id);
  const sprint = sprints.list.find((s) => s.id === id);
  if (!sprint) throw new Error(`Sprint ${id} does not exist`);
  if (typeof actions !== "object" || actions === null || Array.isArray(actions)) throw new Error("actions must be an object");
  for (const [p, a] of Object.entries(actions)) if (!(UNFINISHED_ACTIONS as readonly string[]).includes(a)) throw new Error(`Bad action for ${p}: ${String(a)}`);
  if (resetStatus !== undefined && resetStatus !== null && typeof resetStatus !== "string") throw new Error("resetStatus must be a column id or null");

  const config = sprints.config;
  const columns = board.columns.map((c) => c.id);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (sprint.state !== "active") blockers.push(`Sprint ${id} is ${sprint.state}; only the active sprint can be completed`);

  const doneCols = config.doneColumns.filter((c) => columns.includes(c));
  const missingDone = config.doneColumns.filter((c) => !columns.includes(c));
  if (!doneCols.length) blockers.push(`None of the done statuses (${config.doneColumns.join(", ")}) exist; set sprint.doneColumns in Tasks/gitask.json`);
  else if (missingDone.length) warnings.push(`Done status ${missingDone.join(", ")} does not exist and is ignored`);

  let reset: string | null;
  if (resetStatus === undefined) {
    reset = config.resetStatus;
    if (reset !== null && !columns.includes(reset)) {
      warnings.push(`Status ${reset} does not exist; carried-over tasks keep their status`);
      reset = null;
    }
  } else {
    reset = resetStatus;
    if (reset !== null && !columns.includes(reset)) blockers.push(`Status ${reset} does not exist`);
  }
  if (reset !== null && doneCols.includes(reset)) blockers.push(`Carried-over tasks cannot be reset to a done status (${reset})`);
  const backlogCol = columns.includes(BACKLOG_COLUMN) ? BACKLOG_COLUMN : columns.find((c) => columnLabel(c).toLowerCase() === "backlog");

  const next = `S${sprint.number + 1}`;
  const nextSprint = sprints.list.find((s) => s.id === next);

  const base = (t: Task, column: string): CloseTask => ({
    id: t.id, label: t.displayId ?? t.id, path: t.path, column, ...(t.estimate !== undefined ? { estimate: t.estimate } : {}),
  });
  const done: CloseTask[] = [];
  const unfinished: CloseUnfinished[] = [];
  const resolved: Record<string, UnfinishedAction> = {};
  for (const c of board.columns) for (const t of c.tasks) {
    if (t.sprint !== id) continue;
    if (doneCols.includes(c.id)) {
      done.push(base(t, c.id));
      continue;
    }
    const action: UnfinishedAction = Object.hasOwn(actions, t.path) ? actions[t.path] : config.unfinished;
    resolved[t.path] = action;
    const to = action === "backlog" ? (backlogCol ?? c.id) : (reset ?? c.id);
    const toPath = to === c.id ? t.path : join(board.dir, to, basename(t.path));
    const worktree = t.fields["worktree"];
    unfinished.push({
      ...base(t, c.id), action, to, toPath,
      ...(t.claimedBy ? { claimedBy: t.claimedBy } : {}),
      ...(!isNone(worktree) ? { worktree } : {}),
    });
    if (t.claimedBy || !isNone(worktree)) warnings.push(`${t.displayId ?? t.id} is claimed${t.claimedBy ? ` by ${t.claimedBy}` : ""}; its worktree is not removed`);
  }
  for (const p of Object.keys(actions)) if (!Object.hasOwn(resolved, p)) blockers.push(`Not an unfinished task of ${id}: ${p}`);
  if (!backlogCol && unfinished.some((u) => u.action === "backlog")) blockers.push(`There is no backlog status (${BACKLOG_COLUMN})`);

  // Name clashes: a file of the same name already in the target folder, or two tasks moving to the same path.
  const existing = new Set(board.columns.flatMap((c) => c.tasks.map((t) => t.path)));
  const targets = new Map<string, string>();
  for (const u of unfinished) {
    if (u.toPath === u.path) continue;
    if (existing.has(u.toPath)) blockers.push(`${basename(u.toPath)} already exists in ${columnLabel(u.to)}`);
    else if (targets.has(u.toPath)) blockers.push(`${u.id} and ${targets.get(u.toPath)} would both move to ${columnLabel(u.to)}`);
    targets.set(u.toPath, u.id);
  }

  const toNext = unfinished.filter((u) => u.action === "next");
  const createNext = toNext.length > 0 && !nextSprint;
  if (toNext.length && nextSprint && nextSprint.state !== "planned") blockers.push(`Sprint ${next} is ${nextSprint.state}; carried-over tasks can only join a planned sprint`);
  if (createNext) warnings.push(`Sprint ${next} will be created`);

  const summary: CloseSummary = {
    committed: { tasks: done.length + unfinished.length, points: sum([...done, ...unfinished]) },
    done: { tasks: done.length, points: sum(done) },
    toBacklog: unfinished.filter((u) => u.action === "backlog").map((u) => u.label),
    toNext: toNext.map((u) => u.label),
  };
  // The hash covers what the close does, not the warnings or how the request was phrased.
  const body = { dir: board.dir, id, state: sprint.state, path: sprint.path, next, createNext, resetStatus: reset, done, unfinished, summary, blockers };
  const planHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return { id, next, createNext, resetStatus: reset, actions: resolved, done, unfinished, summary, blockers, warnings, planHash };
}

/** The `## Summary` section written into the sprint file on close. */
export function closeSummaryText(plan: SprintClosePlan, unit: SprintConfig["estimate"], today: string): string {
  const pts = (n: number) => (unit === "none" ? "" : ` · ${n} ${unit === "hours" ? "h" : "pts"}`);
  const s = plan.summary;
  return [
    "## Summary",
    `- Closed: ${today}`,
    `- Committed: ${s.committed.tasks} task${s.committed.tasks === 1 ? "" : "s"}${pts(s.committed.points)} · Done: ${s.done.tasks}${pts(s.done.points)}`,
    `- To backlog: ${s.toBacklog.join(", ") || "none"} · To ${plan.next}: ${s.toNext.join(", ") || "none"}`,
  ].join("\n");
}

/** Replace the `## Summary` section (up to the next `## ` heading) or append it at the end. */
export function writeSummarySection(raw: string, section: string): string {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const at = lines.findIndex((l) => /^##\s+Summary\s*$/i.test(l));
  const block = section.split("\n");
  if (at >= 0) {
    let stop = lines.findIndex((l, n) => n > at && /^##\s/.test(l));
    if (stop < 0) stop = lines.length;
    const rest = lines.slice(stop);
    lines.splice(at, stop - at, ...block, ...(rest.length ? [""] : []));
  } else {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push("", ...block);
  }
  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;
  return out;
}

export interface SprintCloseResult {
  committed: boolean;
  summary: CloseSummary;
  /** Every task moved, old and new path. */
  moved: { from: string; to: string }[];
  /** Every task file whose header was edited (paths after the move). */
  edited: string[];
  /** Path of the next sprint file when the close created it. */
  created?: string;
  /** Commit subject (also when not committed). */
  message: string;
}

/** Refused close: `stale` means the board changed since the plan (re-plan); `blocked` lists the plan's blockers. */
export class SprintCloseError extends Error {
  kind: "stale" | "blocked";
  constructor(kind: "stale" | "blocked", message: string) {
    super(message);
    this.kind = kind;
    this.name = "SprintCloseError";
  }
}

type Undo = { kind: "move"; from: string; to: string } | { kind: "write"; path: string; before: string } | { kind: "create"; path: string };

/**
 * Close a sprint. Loads the board, re-plans with the same `actions` and `resetStatus` and refuses when the hash differs
 * from `planHash` or the plan has blockers. Then checks every file before writing anything, moves (git mv when tracked)
 * and edits the unfinished tasks, writes `## Summary` and `State: closed` into the sprint file, creates the next sprint
 * when needed, and makes ONE commit by pathspec of every touched path (move sources included). Untracked files are
 * moved and edited but not committed; with `commit: false` nothing is committed. On any failure every file is put back
 * and the touched paths are reset in the index. Done tasks are never touched.
 */
export async function applySprintClose(dir: string, request: SprintCloseRequest, planHash: string, opts: SprintOpsOptions = {}): Promise<SprintCloseResult> {
  const board = await loadBoard(dir);
  const plan = planSprintClose(board, request.id, request.actions ?? {}, request.resetStatus);
  if (plan.planHash !== planHash) throw new SprintCloseError("stale", "The board changed since the plan was made; nothing was changed. Plan again.");
  if (plan.blockers.length) throw new SprintCloseError("blocked", `Sprint ${plan.id} was not completed: ${plan.blockers.join("; ")}`);
  const config = board.sprints!.config;
  const today = checkDay(opts.today ?? localDate(), "Today");

  // 1. Check and read everything before the first write.
  const root = await repoRoot(dir);
  const sprintFile = await readSprintFile(dir, plan.id);
  const tracked = async (p: string) => !!root && (await isTracked(dir, p));
  const work: { u: CloseUnfinished; raw: string; git: boolean }[] = [];
  for (const u of plan.unfinished) {
    await assertRegularFile(u.path, dir);
    if (u.toPath !== u.path && (await lstat(u.toPath).then(() => true, () => false))) throw new SprintCloseError("blocked", `${basename(u.toPath)} already exists in ${columnLabel(u.to)}`);
    work.push({ u, raw: await readFile(u.path, "utf8"), git: await tracked(u.path) });
  }
  const nextPath = sprintPath(dir, plan.next);
  if (plan.createNext && (await lstat(nextPath).then(() => true, () => false))) throw new SprintCloseError("stale", `Sprint ${plan.next} already exists; plan again`);
  const sprintTracked = await tracked(sprintFile.path);
  const message = fillTemplate(SPRINT_COMPLETE_MESSAGE, {
    id: plan.id, done: String(plan.summary.done.tasks), backlog: String(plan.summary.toBacklog.length), next: String(plan.summary.toNext.length), nextId: plan.next,
  });

  // 2. Write, keeping an undo journal.
  const undo: Undo[] = [];
  const moved: { from: string; to: string }[] = [];
  const edited: string[] = [];
  const indexPaths = new Set<string>();
  try {
    for (const { u, raw, git } of work) {
      let text = u.action === "backlog" ? removeHeaderField(raw, "Sprint") : editHeaderField(raw, "Sprint", plan.next);
      if (u.toPath !== u.path) {
        await mkdir(dirname(u.toPath), { recursive: true });
        if (git) {
          indexPaths.add(u.path).add(u.toPath);
          await gitMv(root!, u.path, u.toPath);
        } else await rename(u.path, u.toPath);
        undo.push({ kind: "move", from: u.path, to: u.toPath });
        moved.push({ from: u.path, to: u.toPath });
        text = bumpUpdated(text, today);
      }
      undo.push({ kind: "write", path: u.toPath, before: raw });
      await writeFile(u.toPath, text);
      edited.push(u.toPath);
    }
    let created: string | undefined;
    if (plan.createNext) {
      created = await writeNewSprint(dir, plan.next, sprintFileText(plan.next, `Sprint ${plan.next.slice(1)}`, { state: "planned" }));
      undo.push({ kind: "create", path: created });
    }
    let closed = editHeaderField(sprintFile.raw, "State", "closed");
    closed = writeSummarySection(closed, closeSummaryText(plan, config.estimate, today));
    undo.push({ kind: "write", path: sprintFile.path, before: sprintFile.raw });
    await writeFile(sprintFile.path, closed);

    // 3. One commit by pathspec.
    let committed = false;
    if (root && opts.commit !== false) {
      const add = [...work.filter((w) => w.git).map((w) => w.u.toPath), ...(sprintTracked ? [sprintFile.path] : []), ...(created ? [created] : [])];
      const all = [...add, ...work.filter((w) => w.git && w.u.toPath !== w.u.path).map((w) => w.u.path)];
      if (add.length) {
        for (const p of all) indexPaths.add(p);
        await gitAdd(root, ...add);
        await gitCommitPaths(root, message, ...all);
        committed = true;
      }
    }
    return { committed, summary: plan.summary, moved, edited, ...(created ? { created } : {}), message };
  } catch (e) {
    // Put every file back (newest step first), then reset the touched paths in the index to HEAD.
    for (const step of undo.reverse()) {
      try {
        if (step.kind === "write") await writeFile(step.path, step.before);
        else if (step.kind === "create") await unlink(step.path);
        else await rename(step.to, step.from);
      } catch {
        /* keep undoing the rest */
      }
    }
    if (root && indexPaths.size) await gitUnstage(root, ...indexPaths).catch(() => undefined);
    throw e;
  }
}
