// The shell's pure logic: the tested date-range and status-visibility modules, used as they are.
import { statusVisibility } from "@host-src/status-visibility.ts";
import { countTasks, filterBoard, rangeActive, rangeNorm } from "virtual:gitask-filter-logic";
import { filterPeople } from "@host-src/people-filter.ts";
import { filterByFields, pruneFieldSelection } from "@core-src/field-filter.ts";
import { resolveScope, scopeBoard, type ResolvedScope } from "@host-src/sprint-scope.ts";
import type { BoardData, UiState } from "@/host/index.ts";

export { countTasks, filterBoard, rangeActive, rangeNorm };
export const SV = statusVisibility();

export type Range = ReturnType<typeof rangeNorm>;

/** Same fields the old Board filter searched. */
export function matchesText(t: BoardData["columns"][number]["tasks"][number], q: string): boolean {
  if (!q) return true;
  return (t.title + " " + t.id + " " + (t.displayId || "") + " " + (t.owner || "") + " " + (t.claimedBy || "")).toLowerCase().includes(q.toLowerCase());
}

export function filterText(board: BoardData | null, q: string): BoardData | null {
  if (!board || !q) return board;
  return { ...board, columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => matchesText(t, q)) })) };
}

export interface Derived {
  /** Without hidden statuses: what the chips and the empty-column rule look at. */
  visible: BoardData | null;
  /** Visible, then sprint scope, then date range, then people, then fields, then text: what a view draws. */
  shown: BoardData | null;
  range: Range;
  /** The sprint switcher's scope checked against the board (`off` when sprints are not on). */
  scope: ResolvedScope;
}

export function derive(raw: BoardData | null, ui: UiState): Derived {
  const range = rangeNorm(ui.range);
  const visible = (SV.apply(raw, ui.hiddenStatuses) ?? null) as BoardData | null;
  const scope = resolveScope(ui.sprintScope, raw?.sprints);
  const scoped = visible ? scopeBoard(visible, scope, raw?.sprints) : visible;
  const byDate = filterBoard(scoped, range) as BoardData | null;
  const byPeople = byDate ? filterPeople(byDate, ui.people, raw?.people) : byDate;
  const byFields = byPeople ? filterByFields(byPeople, pruneFieldSelection(ui.fields, raw?.config?.fields)) : byPeople;
  const shown = filterText(byFields, ui.filter ?? "");
  return { visible, shown, range, scope };
}
