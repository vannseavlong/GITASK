import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { assertTaskFile } from "./taskfile.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { editHeaderField } from "./taskedit.ts";
import { checkFieldIds } from "./subtasks.ts";
import { isFieldValueId } from "./field-rules.ts";
import type { Board, FieldDef, Subtask, Task } from "./types.ts";

export const FIELD_MESSAGE = "task({id}): set {field}";

/** Selected value ids per field key, e.g. `{ platform: ["app", "landing-page"] }`. */
export type FieldSelection = Record<string, readonly string[]>;

/** The header line name for a field key: `platform` -> `Platform` (the parser lower-cases it back). */
export const headerName = (key: string): string => key[0].toUpperCase() + key.slice(1);

/** Value ids written in a header line (`app, admin-portal`), in order, without duplicates or text that is not an id. */
export function parseFieldList(text: string | undefined): string[] {
  const ids = (text ?? "").split(/[\s,;]+/).filter(isFieldValueId);
  return [...new Set(ids)];
}

/** Header values of every configured field for one task; fields the task does not set are left out. */
export function taskFieldValues(task: Pick<Task, "fields">, defs: readonly FieldDef[]): Record<string, string[]> {
  const out = new Map<string, string[]>();
  for (const f of defs) {
    const ids = parseFieldList(Object.hasOwn(task.fields, f.key) ? task.fields[f.key] : undefined);
    if (ids.length) out.set(f.key, ids);
  }
  return Object.fromEntries(out);
}

/** Set `task.values` on every task of the board for the configured fields (no-op without fields). */
export function applyFieldValues(columns: Board["columns"], defs: readonly FieldDef[]): void {
  if (!defs.length) return;
  for (const c of columns) for (const t of c.tasks) t.values = taskFieldValues(t, defs);
}

const has = (ids: readonly string[] | undefined, want: readonly string[]) => !!ids && want.some((w) => ids.includes(w));

/** Does one sub-task satisfy the selection? Every selected field needs a matching value. */
export function subtaskMatchesFields(sub: Pick<Subtask, "values">, sel: FieldSelection): boolean {
  return Object.entries(sel).every(([k, want]) => !want.length || has(sub.values?.[k], want));
}

/**
 * Does a task satisfy the selection? AND across fields, OR within one field. A field matches when the task's own
 * value or the value of any of its sub-tasks matches. A field with no selected value is not filtered.
 */
export function taskMatchesFields(task: Pick<Task, "values" | "subtasks">, sel: FieldSelection): boolean {
  return Object.entries(sel).every(([k, want]) => !want.length || has(task.values?.[k], want) || task.subtasks.some((s) => has(s.values?.[k], want)));
}

/** The board with only the tasks that match; an empty selection returns the board itself. */
export function filterByFields<B extends { columns: { tasks: Pick<Task, "values" | "subtasks">[] }[] }>(board: B, sel: FieldSelection | undefined): B {
  if (!sel || !Object.values(sel).some((v) => v.length)) return board;
  return { ...board, columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => taskMatchesFields(t, sel)) })) };
}

export interface FieldOptions {
  /** Commit the change (default true). Ignored when the file is not tracked by git. */
  commit?: boolean;
  message?: string;
}

/** Set (or with an empty list clear) one field in the task header: `- **Platform:** app, admin-portal`. Only that line changes. */
export async function setTaskField(task: Task, field: FieldDef, ids: readonly string[], opts: FieldOptions = {}): Promise<{ path: string; changed: boolean; committed: boolean }> {
  checkFieldIds(field, ids);
  await assertTaskFile(task.path);
  const raw = await readFile(task.path, "utf8");
  const out = editHeaderField(raw, headerName(field.key), ids.join(", "));
  if (out === raw) return { path: task.path, changed: false, committed: false };
  await writeFile(task.path, out);
  const cwd = dirname(task.path);
  const root = await repoRoot(cwd);
  if (root && opts.commit !== false && (await isTracked(cwd, task.path))) {
    await gitAdd(root, task.path);
    await gitCommitPaths(root, fillTemplate(opts.message ?? FIELD_MESSAGE, { id: basename(task.path, ".md"), field: field.key }), task.path);
    return { path: task.path, changed: true, committed: true };
  }
  return { path: task.path, changed: true, committed: false };
}
