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
  | { type: "deleteTask"; path: string }
  | { type: "deleteColumn"; column: string };

/** Messages the extension sends to the webview. */
export type HostMessage =
  | { type: "board"; board: unknown }
  | { type: "taskBody"; path: string; text?: string; error?: string }
  | { type: "error"; message: string };

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
    case "deleteTask": {
      const path = taskPathInside(raw.path, ctx);
      return path ? { ok: true, message: { type: "deleteTask", path } } : fail("path is not a task file in the Tasks dir");
    }
    case "deleteColumn": {
      if (typeof raw.column !== "string" || !ctx.columns.includes(raw.column)) return fail("unknown column");
      return { ok: true, message: { type: "deleteColumn", column: raw.column } };
    }
    default:
      return fail(`unknown message type`);
  }
}
