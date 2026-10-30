import { dirname } from "node:path";
import { fileHistory } from "./git.ts";
import { isSubtaskSection } from "./parse.ts";
import { personId } from "./people.ts";
import type { Person } from "./people.ts";
import type { Board, Task } from "./types.ts";

/** Which date the period applies to: when it was done (default for reports), its `Due`, or its last `updated`. */
export type ReportDateField = "done" | "due" | "updated";
export type DateSource = "git" | "updated" | "none";
export type Timeliness = "on-time" | "late" | "no-due";

export interface ReportOptions {
  /** Inclusive `YYYY-MM-DD`; empty or invalid is an open end (same rule as the board's date filter). */
  from?: string;
  to?: string;
  /** Contributors, used to show GitHub names; owners and `@ids` that match none are shown as written. */
  people?: Person[];
  /** Limit the report to these person ids (`"unassigned"` selects the unassigned bucket). Empty or missing: everyone. */
  only?: string[];
  dateField?: ReportDateField;
  includeSubtasks: boolean;
  /** Shown in the header (e.g. the repo folder name). */
  repo?: string;
  /** `YYYY-MM-DD` shown as the generated date; defaults to today. */
  generated?: string;
}

export interface ReportSubtask {
  text: string;
  lane?: string;
  /** Display name of the assignee; `""` when unassigned. */
  assignee: string;
  personKey: string;
}

export interface ReportTask {
  id: string;
  displayId?: string;
  title: string;
  column: string;
  /** Display name of the Owner; `""` when unassigned. */
  owner: string;
  personKey: string;
  /** `YYYY-MM-DD`, or `""` when no date could be found. */
  doneDate: string;
  doneSource: DateSource;
  started: string;
  due: string;
  tier: string;
  timeliness: Timeliness;
  /** Whole days from start to done; undefined when either date is missing or done is before start. */
  days?: number;
  /** Completed sub-tasks (under `## Sub-tasks`), empty when sub-tasks are not included. */
  subtasks: ReportSubtask[];
}

export interface PersonRow {
  key: string;
  /** GitHub name (`github`, else `name`); `Unassigned` for the bucket. Never an email. */
  name: string;
  tasksDone: number;
  subtasksDone: number;
  onTime: number;
  late: number;
  noDue: number;
  avgDays: number | null;
  tiers: Record<string, number>;
}

export interface ReportSummary {
  tasksDone: number;
  subtasksDone: number;
  onTime: number;
  late: number;
  noDue: number;
  avgDays: number | null;
  people: number;
  unassignedTasks: number;
  fromGit: number;
  fromUpdated: number;
  undated: number;
}

export interface Report {
  from: string;
  to: string;
  dateField: ReportDateField;
  includeSubtasks: boolean;
  repo: string;
  generated: string;
  only: string[];
  summary: ReportSummary;
  people: PersonRow[];
  tasks: ReportTask[];
  notes: string[];
}

export const UNASSIGNED_KEY = "unassigned";
export const UNASSIGNED_NAME = "Unassigned";

const DONE_COLUMN = /^[56]-(done|deploy)$/;
const DONE_PATH = /(^|\/)(5-done|6-deploy)\//;
const EMAIL = /[^\s<>@"]+@[^\s<>@"]+\.[^\s<>@"]+/g;

/** Real calendar date `YYYY-MM-DD` or `""` (same rule as `rangeDate` in the board's date filter). */
export function reportDate(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(v);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Inclusive on both ends; an empty or invalid end is open. Without an active range every date passes;
 * with one, a missing date does not. This is the rule of `inRange` in the board's date filter.
 */
export function inReportRange(date: string, from?: string, to?: string): boolean {
  const f = reportDate(from);
  const t = reportDate(to);
  if (!f && !t) return true;
  if (!date) return false;
  if (f && date < f) return false;
  if (t && date > t) return false;
  return true;
}

const dayNumber = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

/** `[start, updated]` dates from the `Started / updated` field; `""` where missing or invalid. */
function startedUpdated(task: Task): [string, string] {
  const raw = task.fields["started / updated"];
  if (typeof raw !== "string") return ["", ""];
  const parts = raw.split("/");
  return [parts.length > 1 ? reportDate(parts[0]) : "", reportDate(parts[parts.length - 1])];
}

/** Text that is safe to print: `Name <a@b.c>` loses the address, any other address is hidden. */
const scrub = (s: string): string => s.replace(/\s*<[^<>]*@[^<>]*>/g, "").replace(EMAIL, "[email]").replace(/\s+/g, " ").trim();

const norm = (s: string) => s.trim().replace(/^@/, "").toLowerCase();

function resolver(people: Person[]) {
  const byKey = new Map<string, Person>();
  for (const p of people) {
    for (const k of [p.id, p.name, p.github]) if (k && !byKey.has(norm(k))) byKey.set(norm(k), p);
    const slug = personId(p.name);
    if (slug && !byKey.has(slug)) byKey.set(slug, p);
  }
  return (raw: string | undefined): { key: string; name: string } => {
    const text = (raw ?? "").trim();
    if (!text) return { key: UNASSIGNED_KEY, name: "" };
    const hit = byKey.get(norm(text)) ?? byKey.get(personId(text));
    if (hit) return { key: hit.id, name: scrub(hit.github || hit.name) || hit.id };
    // An unknown owner is a free-text name; a bare address keeps only its local part.
    const bare = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(text) ? text.slice(0, text.indexOf("@")) : text;
    const name = scrub(bare) || "unknown";
    return { key: `name:${norm(name)}`, name };
  };
}

function tierOf(task: Task): string {
  return /\bT[0-3]\b/i.exec(task.tier ?? "")?.[0].toUpperCase() ?? "none";
}

async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

/**
 * Date of the commit that last moved the file into `5-done/` or `6-deploy/`, or `""`. A move between
 * those two folders is not an entry; a task moved out and back counts from the move back in.
 */
async function gitDoneDate(task: Task): Promise<string> {
  const changes = await fileHistory(dirname(task.path), task.path);
  for (const c of changes) {
    if (!DONE_PATH.test(c.to)) continue;
    if (c.from && DONE_PATH.test(c.from)) continue;
    return c.date;
  }
  return "";
}

const avg = (days: number[]): number | null =>
  days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;

/**
 * Tasks (and sub-tasks) completed in a period, by person. Candidates are the tasks in `5-done/` and
 * `6-deploy/`. The done date comes from git (the move commit) and falls back to the `updated` date;
 * each row says which. Tasks go to their Owner, completed sub-tasks to their assignee.
 */
export async function buildReport(board: Board, opts: ReportOptions): Promise<Report> {
  const dateField: ReportDateField = opts.dateField ?? "done";
  const from = reportDate(opts.from);
  const to = reportDate(opts.to);
  const who = resolver(opts.people ?? []);
  const only = new Set((opts.only ?? []).map((s) => norm(s)));
  const candidates = board.columns.filter((c) => DONE_COLUMN.test(c.id)).flatMap((c) => c.tasks);

  const dated = await inBatches(candidates, 8, async (task) => {
    const [started, updated] = startedUpdated(task);
    const git = await gitDoneDate(task);
    const doneDate = git || updated;
    const doneSource: DateSource = git ? "git" : updated ? "updated" : "none";
    return { task, started, updated, doneDate, doneSource: doneSource as DateSource };
  });

  const rows: ReportTask[] = [];
  for (const { task, started, updated, doneDate, doneSource } of dated) {
    const due = reportDate(task.due);
    const filterDate = dateField === "done" ? doneDate : dateField === "due" ? due : updated;
    if (!inReportRange(filterDate, from, to)) continue;
    const owner = who(task.owner);
    const subtasks: ReportSubtask[] = [];
    if (opts.includeSubtasks) {
      for (const s of task.subtasks) {
        if (!s.checked || !isSubtaskSection(s.section)) continue;
        const a = who(s.assignee);
        subtasks.push({ text: scrub(s.text), ...(s.lane ? { lane: s.lane } : {}), assignee: a.name, personKey: a.key });
      }
    }
    const dayCount = started && doneDate ? dayNumber(doneDate) - dayNumber(started) : -1;
    rows.push({
      id: task.id,
      ...(task.displayId ? { displayId: task.displayId } : {}),
      title: scrub(task.title),
      column: task.column,
      owner: owner.name,
      personKey: owner.key,
      doneDate,
      doneSource,
      started,
      due,
      tier: tierOf(task),
      timeliness: !due || !doneDate ? "no-due" : doneDate <= due ? "on-time" : "late",
      ...(dayCount >= 0 ? { days: dayCount } : {}),
      subtasks,
    });
  }

  const selected = (key: string) => only.size === 0 || only.has(key.toLowerCase());
  const involved = (t: ReportTask) => selected(t.personKey) || t.subtasks.some((s) => selected(s.personKey));
  const tasks = rows.filter(involved).sort((a, b) => a.doneDate.localeCompare(b.doneDate) || a.id.localeCompare(b.id));

  const names = new Map<string, string>([[UNASSIGNED_KEY, UNASSIGNED_NAME]]);
  const acc = new Map<string, { row: PersonRow; days: number[] }>();
  const person = (key: string, name: string) => {
    if (!names.has(key) && name) names.set(key, name);
    let e = acc.get(key);
    if (!e) {
      e = { row: { key, name: names.get(key) ?? name, tasksDone: 0, subtasksDone: 0, onTime: 0, late: 0, noDue: 0, avgDays: null, tiers: {} }, days: [] };
      acc.set(key, e);
    }
    return e;
  };
  const owned: ReportTask[] = [];
  for (const t of tasks) {
    if (selected(t.personKey)) {
      owned.push(t);
      const e = person(t.personKey, t.owner);
      e.row.tasksDone++;
      if (t.timeliness === "on-time") e.row.onTime++;
      else if (t.timeliness === "late") e.row.late++;
      else e.row.noDue++;
      e.row.tiers[t.tier] = (e.row.tiers[t.tier] ?? 0) + 1;
      if (t.days !== undefined) e.days.push(t.days);
    }
    for (const s of t.subtasks) if (selected(s.personKey)) person(s.personKey, s.assignee).row.subtasksDone++;
  }
  const people = [...acc.values()].map((e) => ({ ...e.row, avgDays: avg(e.days) }));
  people.sort((a, b) => Number(a.key === UNASSIGNED_KEY) - Number(b.key === UNASSIGNED_KEY) || b.tasksDone + b.subtasksDone - (a.tasksDone + a.subtasksDone) || a.name.localeCompare(b.name));

  const summary: ReportSummary = {
    tasksDone: owned.length,
    subtasksDone: people.reduce((n, p) => n + p.subtasksDone, 0),
    onTime: owned.filter((t) => t.timeliness === "on-time").length,
    late: owned.filter((t) => t.timeliness === "late").length,
    noDue: owned.filter((t) => t.timeliness === "no-due").length,
    avgDays: avg(owned.flatMap((t) => (t.days === undefined ? [] : [t.days]))),
    people: people.filter((p) => p.key !== UNASSIGNED_KEY).length,
    unassignedTasks: owned.filter((t) => t.personKey === UNASSIGNED_KEY).length,
    fromGit: tasks.filter((t) => t.doneSource === "git").length,
    fromUpdated: tasks.filter((t) => t.doneSource === "updated").length,
    undated: tasks.filter((t) => t.doneSource === "none").length,
  };

  const notes = [
    "Done date: the date of the commit that moved the task into 5-done or 6-deploy (git log --follow). A task moved out and back counts from the last move in.",
    `${summary.fromGit} of ${tasks.length} tasks used the git date; ${summary.fromUpdated} fell back to the "Started / updated" date (no git history for the move); ${summary.undated} had no usable date.`,
    "On time means done on or before Due. Tasks without a Due date are listed separately, not counted as on time.",
    "Days to done: whole days from the Started date to the done date; tasks missing either date are left out of the average.",
  ];
  if (opts.includeSubtasks) {
    notes.push(
      "Sub-tasks are the ticked items under Sub-tasks, credited to the person named by @ on that line. A sub-task has no date of its own, so it counts in the period of its task. Sub-tasks without @ go to Unassigned.",
    );
  } else notes.push("Sub-tasks are not included in this report.");
  if (dateField !== "done") notes.push(`The period filters on the ${dateField === "due" ? "Due" : "updated"} date, not the done date.`);
  if (only.size) notes.push("The report is limited to selected people; a task is listed when its Owner or one of its completed sub-task assignees is selected.");
  if (from || to) notes.push("Tasks with no usable date for the chosen field are left out when a period is set.");

  return {
    from,
    to,
    dateField,
    includeSubtasks: opts.includeSubtasks,
    repo: scrub(opts.repo ?? ""),
    generated: reportDate(opts.generated) || new Date().toISOString().slice(0, 10),
    only: [...only],
    summary,
    people,
    tasks,
    notes,
  };
}
