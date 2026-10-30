// The shell's pure logic: the tested date-range and status-visibility modules, used as they are.
import { statusVisibility } from "@host-src/status-visibility.ts";
import { countTasks, filterBoard, rangeActive, rangeNorm } from "virtual:gitask-filter-logic";
import { filterPeople } from "@host-src/people-filter.ts";
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
  /** Visible, then date range, then people, then text: what a view draws. */
  shown: BoardData | null;
  range: Range;
}

export function derive(raw: BoardData | null, ui: UiState): Derived {
  const range = rangeNorm(ui.range);
  const visible = (SV.apply(raw, ui.hiddenStatuses) ?? null) as BoardData | null;
  const byDate = filterBoard(visible, range) as BoardData | null;
  const byPeople = byDate ? filterPeople(byDate, ui.people, raw?.people) : byDate;
  const shown = filterText(byPeople, ui.filter ?? "");
  return { visible, shown, range };
}
