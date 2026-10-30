// Pure message protocol between a UI host (VS Code webview or `gitask serve`) and its backend. No `vscode` import,
// so node:test can run it. Every webview message goes through `validateMessage` before it
// touches the filesystem or git.
import type { DeleteImpact } from "./delete.ts";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Messages the webview may send. */
export type WebviewMessage =
  | { type: "ready" }
  | { type: "open"; path: string }
  | { type: "new"; column?: string }
  | { type: "move"; path: string; to: string }
  | { type: "toggleSubtask"; path: string; index: number; line: number }
  | { type: "addSubtask"; path: string; text: string; assignee?: string; lane?: string }
  | { type: "setSubtaskAssignee"; path: string; index: number; line: number; assignee: string | null }
  | { type: "setSubtaskLane"; path: string; index: number; line: number; lane: string | null }
  | { type: "editSubtask"; path: string; index: number; line: number; text?: string; assignee?: string | null; lane?: string | null }
  /** `confirmed: true` is set only by a UI that has shown the confirm dialog; `gitask serve` refuses a delete without it. */
  | { type: "deleteSubtask"; path: string; index: number; line: number; confirmed?: true }
  /** Edit the title and header fields of a task. Absent field = unchanged, `null` = clear. */
  | { type: "editTask"; path: string; patch: EditTaskPatch }
  | { type: "readTask"; path: string }
  | { type: "view"; id: string }
  | { type: "previewReport"; options: ReportRequest }
  | { type: "exportReport"; options: ReportRequest; format: ReportFormat }
  | { type: "setColumnColor"; column: string; color: string | null }
  /** Ask what deleting this task would cost (for a confirm dialog). The host answers with `deleteImpact`. */
  | { type: "deleteImpact"; path: string }
  /** `confirmed: true` is set only by a UI that has shown the confirm dialog; `gitask serve` refuses a delete without it. */
  | { type: "deleteTask"; path: string; confirmed?: true }
  | { type: "deleteColumn"; column: string; confirmed?: true }
  | { type: "setOwner"; path: string; person: string | null }
  | { type: "addPerson"; name: string; path?: string }
  /** Dry run: ask what a GitHub sync would do. Never sends anything to GitHub. */
  | { type: "githubPlan" }
  /**
   * Apply the sync. The host recomputes the plan itself and holds the token; the webview sends none. It carries the
   * repo and the plan hash the user was shown; the host refuses when either differs from what it would use now.
   */
  | { type: "githubSync"; confirmRepo: string; planHash: string };

/** The validated patch of an `editTask` message (see `TaskPatch` in taskedit.ts; owner is a person id). */
export interface EditTaskPatch {
  title?: string;
  due?: string | null;
  tier?: "T0" | "T1" | "T2" | "T3" | null;
  owner?: string | null;
  claimedBy?: string | null;
}

/** What a sub-task delete dialog says (VS Code modal and the browser dialog share it). */
export const SUBTASK_DELETE_DETAIL = "Only this checkbox line is removed from the task file. If the file is tracked by git the removal is committed, so it can be restored from history.";

/** Messages the extension sends to the webview. */
export type HostMessage =
  | { type: "board"; board: unknown }
  | { type: "taskBody"; path: string; text?: string; error?: string }
  | { type: "deleteImpact"; path: string; impact: DeleteImpact; detail: string }
  | { type: "reportPreview"; html: string; error?: string }
  | { type: "reportExported"; ok: boolean; path?: string; error?: string }
  | { type: "githubPlanResult"; plan?: GithubPlanView; error?: string }
  | { type: "githubSyncResult"; ok: boolean; summary?: string; warnings?: string[]; error?: string }
  | { type: "error"; message: string };

/** What the webview sees of a sync plan: titles, actions and GitHub names only (no paths, bodies or tokens). */
export interface GithubPlanView {
  repo: string;
  /** Hash of the plan; send it back in `githubSync` so the host can refuse a plan that changed after it was shown. */
  hash: string;
  /** `github.repo` is not the origin remote: the dialog must warn in red and require a tick before it enables Confirm. */
  repoMismatch?: { configured: string; origin: string | null; message: string };
  project?: number;
  issues: {
    taskId: string;
    title: string;
    action: "create" | "update";
    issue?: number;
    state: "open" | "closed";
    assignees: string[];
    subIssues: { title: string; state: "open" | "closed"; assignees: string[] }[];
  }[];
  notify: { login: string; name: string; tasks: string[] }[];
  warnings: string[];
}

/** What the webview may ask for in a report. The host builds the report itself from these validated values. */
export interface ReportRequest {
  /** `YYYY-MM-DD` or `""` (open end). */
  from: string;
  to: string;
  dateField: "done" | "due" | "updated";
  /** Person ids (`unassigned` allowed); empty means everyone. */
  people: string[];
  includeSubtasks: boolean;
}
export type ReportFormat = "html" | "markdown" | "csv";

export const REPORT_FORMATS: readonly ReportFormat[] = ["html", "markdown", "csv"];
export const REPORT_DATE_FIELDS = ["done", "due", "updated"] as const;
export const MAX_REPORT_PEOPLE = 200;
// Person ids: slugs, plus `name:<free text>` keys for owners not in the people list (report.ts). No `@`, `/`, `<`.
const REPORT_PERSON_ID = /^(name:)?[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/;

function realDay(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Validates report options; returns a clean copy (unknown fields dropped) or the reason. */
export function validateReportRequest(raw: unknown): { ok: true; options: ReportRequest } | { ok: false; reason: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, reason: "bad report options" };
  const o = raw as Record<string, unknown>;
  for (const k of ["from", "to"] as const) {
    if (typeof o[k] !== "string" || (o[k] !== "" && !realDay(o[k] as string))) return { ok: false, reason: `${k} must be YYYY-MM-DD or empty` };
  }
  const from = o.from as string;
  const to = o.to as string;
  if (from && to && from > to) return { ok: false, reason: "from is after to" };
  if (typeof o.dateField !== "string" || !(REPORT_DATE_FIELDS as readonly string[]).includes(o.dateField)) return { ok: false, reason: "unknown date field" };
  if (typeof o.includeSubtasks !== "boolean") return { ok: false, reason: "includeSubtasks must be true or false" };
  if (!Array.isArray(o.people) || o.people.length > MAX_REPORT_PEOPLE) return { ok: false, reason: "too many people" };
  const seen = new Set<string>();
  for (const p of o.people) {
    if (typeof p !== "string" || !REPORT_PERSON_ID.test(p)) return { ok: false, reason: "bad person id" };
    seen.add(p);
  }
  return { ok: true, options: { from, to, dateField: o.dateField as ReportRequest["dateField"], people: [...seen], includeSubtasks: o.includeSubtasks } };
}

export interface ValidationContext {
  /** Absolute tasks directory. */
  tasksDir: string;
  /** Existing column folder names, e.g. `1-backlog`. */
  columns: readonly string[];
  /** Registered view ids. */
  views: readonly string[];
}

export type ValidationResult = { ok: true; message: WebviewMessage } | { ok: false; reason: string };

const MAX_INDEX = 100_000;
const MAX_SUBTASK_TEXT = 200;
const MAX_TITLE_LEN = 200;
const MAX_CLAIMED_LEN = 120;
/** Control characters and line separators: never allowed in a single-line value. */
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/;
// Same charsets as core subtasks.ts (PERSON, LANE).
const PERSON = /^[A-Za-z0-9_](?:[\w.-]*\w)?$/;
const LANE = /^[A-Za-z][\w-]*$/;
/** Checkbox syntax inside a sub-task would be read back as another sub-task. */
export const CHECKBOX = /\[[ xX]\]/;

function indexLine(raw: Record<string, unknown>): { index: number; line: number } | string {
  const i = raw.index;
  if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i > MAX_INDEX) return "bad sub-task index";
  const line = raw.line;
  if (typeof line !== "number" || !Number.isInteger(line) || line < 1 || line > MAX_INDEX) return "bad sub-task line";
  return { index: i, line };
}

/** A person id is a slug: lower-case letters and digits with single dashes (core `personId`). */
export const PERSON_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const GITHUB_SLUG = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;

/**
 * A task file path: absolute, ends in `.md`, and resolves to `<tasksDir>/<existing column>/<file>.md`.
 * Returns the normalised path, or undefined.
 */
export function taskPathInside(value: unknown, ctx: ValidationContext): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096 || value.includes("\0")) return undefined;
  if (!isAbsolute(value)) return undefined;
  const abs = resolve(value);
  const rel = relative(resolve(ctx.tasksDir), abs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  const parts = rel.split(sep);
  if (parts.length !== 2) return undefined;
  const [column, file] = parts;
  if (!ctx.columns.includes(column) || !file.endsWith(".md") || file.length <= 3) return undefined;
  return abs;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(reason: string): ValidationResult {
  return { ok: false, reason };
}

export function validateMessage(raw: unknown, ctx: ValidationContext): ValidationResult {
  if (!isRecord(raw) || typeof raw.type !== "string") return fail("not a message");
  switch (raw.type) {
    case "ready":
      return { ok: true, message: { type: "ready" } };
    case "open": {
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "open", path } } : fail("path is not a task file in the Tasks dir");
    }
    case "new": {
      if (raw.column === undefined) return { ok: true, message: { type: "new" } };
      if (typeof raw.column !== "string" || !ctx.columns.includes(raw.column)) return fail("unknown column");
      return { ok: true, message: { type: "new", column: raw.column } };
    }
    case "move": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      if (typeof raw.to !== "string" || !ctx.columns.includes(raw.to)) return fail("unknown column");
      return { ok: true, message: { type: "move", path, to: raw.to } };
    }
    case "toggleSubtask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      const i = raw.index;
      if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i > MAX_INDEX) return fail("bad sub-task index");
      const line = raw.line;
      if (typeof line !== "number" || !Number.isInteger(line) || line < 1 || line > MAX_INDEX) return fail("bad sub-task line");
      return { ok: true, message: { type: "toggleSubtask", path, index: i, line } };
    }
    case "addSubtask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      if (typeof raw.text !== "string") return fail("bad sub-task text");
      const text = raw.text.trim();
      if (!text || text.length > MAX_SUBTASK_TEXT || /[\r\n\0]/.test(text)) return fail("sub-task text must be one line of 1-200 characters");
      if (CHECKBOX.test(text)) return fail("sub-task text must not contain [ ] or [x]");
      const message: Extract<WebviewMessage, { type: "addSubtask" }> = { type: "addSubtask", path, text };
      if (raw.assignee !== undefined) {
        if (typeof raw.assignee !== "string" || raw.assignee.length > 100 || !PERSON.test(raw.assignee)) return fail("bad assignee");
        message.assignee = raw.assignee;
      }
      if (raw.lane !== undefined) {
        if (typeof raw.lane !== "string" || raw.lane.length > 40 || !LANE.test(raw.lane)) return fail("bad lane");
        message.lane = raw.lane;
      }
      return { ok: true, message };
    }
    case "setSubtaskAssignee": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      const il = indexLine(raw);
      if (typeof il === "string") return fail(il);
      const a = raw.assignee;
      if (a !== null && (typeof a !== "string" || a.length > 100 || !PERSON.test(a))) return fail("bad assignee");
      return { ok: true, message: { type: "setSubtaskAssignee", path, ...il, assignee: a } };
    }
    case "setSubtaskLane": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      const il = indexLine(raw);
      if (typeof il === "string") return fail(il);
      const l = raw.lane;
      if (l !== null && (typeof l !== "string" || l.length > 40 || !LANE.test(l))) return fail("bad lane");
      return { ok: true, message: { type: "setSubtaskLane", path, ...il, lane: l } };
    }
    case "editSubtask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      const il = indexLine(raw);
      if (typeof il === "string") return fail(il);
      const message: Extract<WebviewMessage, { type: "editSubtask" }> = { type: "editSubtask", path, ...il };
      if (raw.text !== undefined) {
        if (typeof raw.text !== "string") return fail("bad sub-task text");
        const text = raw.text.trim();
        if (!text || text.length > MAX_SUBTASK_TEXT || CONTROL.test(text)) return fail("sub-task text must be one line of 1-200 characters");
        if (CHECKBOX.test(text)) return fail("sub-task text must not contain [ ] or [x]");
        message.text = text;
      }
      if (raw.assignee !== undefined) {
        const a = raw.assignee;
        if (a !== null && (typeof a !== "string" || a.length > 100 || !PERSON.test(a))) return fail("bad assignee");
        message.assignee = a;
      }
      if (raw.lane !== undefined) {
        const l = raw.lane;
        if (l !== null && (typeof l !== "string" || l.length > 40 || !LANE.test(l))) return fail("bad lane");
        message.lane = l;
      }
      return { ok: true, message };
    }
    case "deleteSubtask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      const il = indexLine(raw);
      if (typeof il === "string") return fail(il);
      if (raw.confirmed !== undefined && raw.confirmed !== true) return fail("confirmed must be true");
      return { ok: true, message: raw.confirmed ? { type: "deleteSubtask", path, ...il, confirmed: true } : { type: "deleteSubtask", path, ...il } };
    }
    case "editTask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      if (!isRecord(raw.patch)) return fail("bad patch");
      const p = raw.patch;
      const patch: EditTaskPatch = {};
      if (p.title !== undefined) {
        if (typeof p.title !== "string") return fail("bad title");
        const t = p.title.trim();
        if (!t || t.length > MAX_TITLE_LEN || CONTROL.test(t)) return fail("title must be one line of 1-200 characters");
        patch.title = t;
      }
      if (p.due !== undefined) {
        if (p.due !== null && (typeof p.due !== "string" || !realDay(p.due))) return fail("due must be a real date, YYYY-MM-DD");
        patch.due = p.due;
      }
      if (p.tier !== undefined) {
        if (p.tier !== null && (typeof p.tier !== "string" || !["T0", "T1", "T2", "T3"].includes(p.tier))) return fail("tier must be T0, T1, T2 or T3");
        patch.tier = p.tier as EditTaskPatch["tier"];
      }
      if (p.owner !== undefined) {
        if (p.owner !== null && (typeof p.owner !== "string" || p.owner.length > MAX_NAME || !PERSON_ID.test(p.owner))) return fail("bad person id");
        patch.owner = p.owner;
      }
      if (p.claimedBy !== undefined) {
        if (p.claimedBy !== null) {
          if (typeof p.claimedBy !== "string") return fail("bad claimed by");
          const c = p.claimedBy.trim();
          if (!c || c.length > MAX_CLAIMED_LEN || CONTROL.test(c)) return fail("claimed by must be one line of 1-120 characters");
          patch.claimedBy = c;
        } else patch.claimedBy = null;
      }
      if (!Object.keys(patch).length) return fail("nothing to change");
      return { ok: true, message: { type: "editTask", path, patch } };
    }
    case "readTask": {
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "readTask", path } } : fail("path is not a task file in the Tasks dir");
    }
    case "view": {
      if (typeof raw.id !== "string" || !ctx.views.includes(raw.id)) return fail("unknown view");
      return { ok: true, message: { type: "view", id: raw.id } };
    }
    case "setColumnColor": {
      if (typeof raw.column !== "string" || !ctx.columns.includes(raw.column)) return fail("unknown column");
      if (raw.color === null) return { ok: true, message: { type: "setColumnColor", column: raw.column, color: null } };
      if (typeof raw.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(raw.color)) return fail("colour must be #rrggbb");
      return { ok: true, message: { type: "setColumnColor", column: raw.column, color: raw.color } };
    }
    case "deleteImpact": {
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "deleteImpact", path } } : fail("path is not a task file in the Tasks dir");
    }
    case "deleteTask": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      if (raw.confirmed !== undefined && raw.confirmed !== true) return fail("confirmed must be true");
      return { ok: true, message: raw.confirmed ? { type: "deleteTask", path, confirmed: true } : { type: "deleteTask", path } };
    }
    case "deleteColumn": {
      if (typeof raw.column !== "string" || !ctx.columns.includes(raw.column)) return fail("unknown column");
      if (raw.confirmed !== undefined && raw.confirmed !== true) return fail("confirmed must be true");
      return { ok: true, message: raw.confirmed ? { type: "deleteColumn", column: raw.column, confirmed: true } : { type: "deleteColumn", column: raw.column } };
    }
    case "previewReport": {
      const r = validateReportRequest(raw.options);
      return r.ok ? { ok: true, message: { type: "previewReport", options: r.options } } : fail(r.reason);
    }
    case "exportReport": {
      const r = validateReportRequest(raw.options);
      if (!r.ok) return fail(r.reason);
      if (typeof raw.format !== "string" || !(REPORT_FORMATS as readonly string[]).includes(raw.format)) return fail("unknown report format");
      return { ok: true, message: { type: "exportReport", options: r.options, format: raw.format as ReportFormat } };
    }
    case "setOwner": {
      const path = taskPathInside(raw.path, ctx);
      if (!path) return fail("path is not a task file in the Tasks dir");
      if (raw.person === null) return { ok: true, message: { type: "setOwner", path, person: null } };
      if (typeof raw.person !== "string" || raw.person.length > MAX_NAME || !PERSON_ID.test(raw.person)) return fail("bad person id");
      return { ok: true, message: { type: "setOwner", path, person: raw.person } };
    }
    case "addPerson": {
      const name = typeof raw.name === "string" ? raw.name.replace(/\s+/g, " ").trim() : "";
      if (!name || name.length > MAX_NAME || /[\u0000-\u001f\u007f]/.test(name)) return fail("bad person name");
      if (raw.path === undefined) return { ok: true, message: { type: "addPerson", name } };
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "addPerson", name, path } } : fail("path is not a task file in the Tasks dir");
    }
    case "githubPlan":
      return { ok: true, message: { type: "githubPlan" } };
    case "githubSync": {
      if (typeof raw.confirmRepo !== "string" || !GITHUB_SLUG.test(raw.confirmRepo)) return fail("bad confirmRepo");
      if (typeof raw.planHash !== "string" || !/^[0-9a-f]{64}$/.test(raw.planHash)) return fail("bad planHash");
      return { ok: true, message: { type: "githubSync", confirmRepo: raw.confirmRepo, planHash: raw.planHash } };
    }
    default:
      return fail(`unknown message type`);
  }
}
