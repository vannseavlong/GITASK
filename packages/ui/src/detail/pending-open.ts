import type { BoardData } from "../host/index.ts";

/** The task path to open after `taskCreated`, once the board holds that task; `null` while it is not there yet. */
export function readyToOpen(board: BoardData | null, pending: string | null): string | null {
  if (!board || !pending) return null;
  for (const c of board.columns) for (const t of c.tasks) if (t.path === pending) return pending;
  return null;
}
