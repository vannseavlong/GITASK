// Pure message protocol between the webview and the extension host. No `vscode` import,
// so node:test can run it. Every webview message goes through `validateMessage` before it
// touches the filesystem or git.
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Messages the webview may send. */
export type WebviewMessage =
  | { type: "ready" }
  | { type: "open"; path: string }
  | { type: "new"; column?: string }
  | { type: "move"; path: string; to: string }
  | { type: "toggleSubtask"; path: string; index: number; line: number }
  | { type: "readTask"; path: string }
  | { type: "view"; id: string }
  | { type: "previewReport"; options: ReportRequest }
  | { type: "exportReport"; options: ReportRequest; format: ReportFormat }
  | { type: "setColumnColor"; column: string; color: string | null }
  | { type: "deleteTask"; path: string }
  | { type: "deleteColumn"; column: string };

/** Messages the extension sends to the webview. */
export type HostMessage =
  | { type: "board"; board: unknown }
  | { type: "taskBody"; path: string; text?: string; error?: string }
  | { type: "reportPreview"; html: string; error?: string }
  | { type: "reportExported"; ok: boolean; path?: string; error?: string }
  | { type: "error"; message: string };

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
const PERSON_ID = /^(name:)?[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/;

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
    if (typeof p !== "string" || !PERSON_ID.test(p)) return { ok: false, reason: "bad person id" };
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
    case "deleteTask": {
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "deleteTask", path } } : fail("path is not a task file in the Tasks dir");
    }
    case "deleteColumn": {
      if (typeof raw.column !== "string" || !ctx.columns.includes(raw.column)) return fail("unknown column");
      return { ok: true, message: { type: "deleteColumn", column: raw.column } };
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
    default:
      return fail(`unknown message type`);
  }
}
