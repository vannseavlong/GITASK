import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { assertTaskFile } from "./taskfile.ts";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { editHeaderField } from "./taskedit.ts";
import { checkFieldIds } from "./subtasks.ts";
import { parseTask } from "./parse.ts";
import { isFieldValueId } from "./field-rules.ts";
import type { Board, FieldDef, Task } from "./types.ts";
export { filterByFields, taskMatchesFields, subtaskMatchesFields, visibleSubtasks, pruneFieldSelection } from "./field-filter.ts";
export type { FieldSelection } from "./field-filter.ts";

export const FIELD_MESSAGE = "task({id}): set {field}";

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
  const now = parseTask(task.path, task.column, raw).fields;
  const before = Object.hasOwn(now, field.key) ? now[field.key] : "";
  if (before !== (Object.hasOwn(task.fields, field.key) ? task.fields[field.key] : "")) throw new Error(`${task.id} changed since it was read; reload and try again`);
  // A line holding text that is not an id (`App, Admin Portal`) would be lost by the rewrite: leave it to the user.
  const words = new Set(before.split(/[\s,;]+/).filter(Boolean));
  if (words.size !== parseFieldList(before).length) throw new Error(`The ${field.label} line in ${task.id} holds text that is not a value id; edit it in the file`);
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
