// Pure sub-task helpers shared by the React UI and node:test. No vscode, no DOM.

interface SubLike { section: string; assignee?: string; lane?: string; checked: boolean; text: string; line: number }
interface TaskLike { owner?: string; subtasks: readonly SubLike[] }

/** Same rule as core `isSubtaskSection`, duplicated so the webview never imports node-only core code. */
export const isSubSection = (section: string): boolean => /^sub-?tasks\b/i.test(section);

/** The sub-tasks that live under `## Sub-tasks` (the ones that can have an assignee and a lane), with their board index. */
export function listSubtasks<S extends SubLike>(task: { subtasks: readonly S[] }): { sub: S; index: number }[] {
  return task.subtasks.map((sub, index) => ({ sub, index })).filter((x) => isSubSection(x.sub.section));
}

const norm = (v: string | undefined) => (v ?? "").trim().toLowerCase();

/** True when the person owns the task or any of its sub-tasks. An empty person id matches everything. */
export function taskInvolves(task: TaskLike, personId: string): boolean {
  const p = norm(personId);
  if (!p) return true;
  if (norm(task.owner) === p) return true;
  return task.subtasks.some((s) => norm(s.assignee) === p);
}

/** Distinct people on a task: the owner first, then sub-task assignees in order. */
export function involvedPeople(task: TaskLike): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [task.owner, ...task.subtasks.map((s) => s.assignee)]) {
    const k = norm(id);
    if (!id || !k || k === "none" || seen.has(k)) continue;
    seen.add(k);
    out.push(id);
  }
  return out;
}

/** Expansion state is a plain list of task paths (JSON safe, remembered in the view state). */
export function toggleExpanded(list: readonly string[] | undefined, path: string): string[] {
  const cur = list ?? [];
  return cur.includes(path) ? cur.filter((p) => p !== path) : [...cur, path];
}
export const expandAll = (paths: readonly string[]): string[] => [...new Set(paths)];
export const collapseAll = (): string[] => [];
/** Drop remembered paths that no longer exist, so the state does not grow without bound. */
export const pruneExpanded = (list: readonly string[] | undefined, existing: readonly string[]): string[] => (list ?? []).filter((p) => existing.includes(p));

/** The "split into" template: one sub-task per lane. */
export const SPLIT_TEMPLATE: readonly { lane: string; text: string }[] = [
  { lane: "backend", text: "Backend" },
  { lane: "uxui", text: "UX/UI" },
  { lane: "frontend", text: "Frontend" },
];
