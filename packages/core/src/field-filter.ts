// Pure "filter by configured field" shared by every view. No imports besides types and no I/O, so the UI
// bundles this file as it is (alias `@core-src`).
import type { Subtask, Task } from "./types.ts";

/** Selected value ids per field key, e.g. `{ platform: ["app", "landing-page"] }`. */
export type FieldSelection = Record<string, readonly string[]>;

const own = (v: Record<string, string[]> | undefined, k: string): readonly string[] | undefined => (v && Object.hasOwn(v, k) ? v[k] : undefined);
const has = (ids: readonly string[] | undefined, want: readonly string[]) => !!ids && want.some((w) => ids.includes(w));

/** Does one sub-task satisfy the selection? Every selected field needs a matching value. */
export function subtaskMatchesFields(sub: Pick<Subtask, "values">, sel: FieldSelection): boolean {
  return Object.entries(sel).every(([k, want]) => !want.length || has(own(sub.values, k), want));
}

/**
 * Does a task satisfy the selection? AND across fields, OR within one field. A field matches when the task's own
 * value or the value of any of its sub-tasks matches. A field with no selected value is not filtered.
 */
export function taskMatchesFields(task: Pick<Task, "values" | "subtasks">, sel: FieldSelection): boolean {
  return Object.entries(sel).every(([k, want]) => !want.length || has(own(task.values, k), want) || task.subtasks.some((s) => has(own(s.values, k), want)));
}

/** The board with only the tasks that match; an empty selection returns the board itself. */
export function filterByFields<B extends { columns: { tasks: Pick<Task, "values" | "subtasks">[] }[] }>(board: B, sel: FieldSelection | undefined): B {
  if (!sel || !Object.values(sel).some((v) => v.length)) return board;
  return { ...board, columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => taskMatchesFields(t, sel)) })) };
}


/**
 * The sub-tasks of a task worth showing under an active selection. All of them when nothing is selected or when the
 * task's own header already satisfies every selected field; otherwise the ones that carry a selected value of any
 * selected field (a task can match through different sub-tasks for different fields).
 */
export function visibleSubtasks<S extends Pick<Subtask, "values">>(task: { values?: Record<string, string[]> }, subtasks: readonly S[], sel: FieldSelection | undefined): S[] {
  const active = Object.entries(sel ?? {}).filter(([, want]) => want.length);
  if (!active.length) return [...subtasks];
  if (active.every(([k, want]) => has(own(task.values, k), want))) return [...subtasks];
  return subtasks.filter((s) => active.some(([k, want]) => has(own(s.values, k), want)));
}

/** The selection without fields or values the config no longer lists, so a stale remembered choice cannot hide every task. */
export function pruneFieldSelection(sel: FieldSelection | undefined, defs: readonly { key: string; values: readonly { id: string }[] }[] | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of defs ?? []) {
    if (!sel || !Object.hasOwn(sel, f.key)) continue;
    const ids = sel[f.key].filter((id) => f.values.some((v) => v.id === id));
    if (ids.length) out[f.key] = ids;
  }
  return out;
}
