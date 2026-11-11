// Pure logic of the Complete sprint dialog. No React, no DOM; tested in packages/vscode/test/sprint-close.test.ts.

export type CloseAction = "backlog" | "next";

interface CloseSummaryLike {
  committed: { tasks: number; points: number };
  done: { tasks: number; points: number };
  toBacklog: readonly string[];
  toNext: readonly string[];
}
interface ClosePlanLike {
  next: string;
  unfinished: readonly { path: string; estimate?: number }[];
  blockers: readonly string[];
}

/**
 * The status the "Reset status" checkbox resets carried-over tasks to: the config `resetStatus` when it is a column,
 * else `2-todo` when it exists, else none (the checkbox is not shown).
 */
export function resetTarget(configReset: string | null, columns: readonly string[], doneColumns: readonly string[] = []): string | undefined {
  if (configReset && columns.includes(configReset) && !doneColumns.includes(configReset)) return configReset;
  return columns.includes("2-todo") && !doneColumns.includes("2-todo") ? "2-todo" : undefined;
}

/** Every unfinished task of the plan gets `action` ("Apply to all"). */
export function applyToAll(plan: ClosePlanLike, action: CloseAction): Record<string, CloseAction> {
  return Object.fromEntries(plan.unfinished.map((u) => [u.path, action]));
}

/** The actions to send after one row changed: the plan's resolved actions with that row replaced. */
export function withAction(current: Readonly<Record<string, CloseAction>>, path: string, action: CloseAction): Record<string, CloseAction> {
  return { ...current, [path]: action };
}

/** Keep only actions for tasks the plan lists as unfinished (a task closed or removed meanwhile is dropped). */
export function knownActions(sent: Readonly<Record<string, CloseAction>>, plan: ClosePlanLike): { actions: Record<string, CloseAction>; dropped: number } {
  const ok = new Set(plan.unfinished.map((u) => u.path));
  const actions: Record<string, CloseAction> = {};
  let dropped = 0;
  for (const [p, a] of Object.entries(sent)) {
    if (ok.has(p)) actions[p] = a;
    else dropped++;
  }
  return { actions, dropped };
}

/** `3 pts`, `1.5 h`, or "" when estimates are off. */
export function pointsText(n: number, unit: string | undefined): string {
  return unit ? `${Math.round(n * 100) / 100} ${unit}` : "";
}

const tasks = (n: number) => `${n} task${n === 1 ? "" : "s"}`;

/** The three summary tiles: done, unfinished, points (points is absent when estimates are off). */
export function summaryTiles(summary: CloseSummaryLike, unit: string | undefined): { label: string; value: string; detail?: string }[] {
  const unfinished = summary.committed.tasks - summary.done.tasks;
  const out: { label: string; value: string; detail?: string }[] = [
    { label: "Done", value: String(summary.done.tasks), detail: `of ${tasks(summary.committed.tasks)}` },
    { label: "Unfinished", value: String(unfinished), detail: `${summary.toBacklog.length} to backlog · ${summary.toNext.length} to next` },
  ];
  if (unit) out.push({ label: unit === "h" ? "Hours" : "Points", value: `${Math.round(summary.done.points * 100) / 100}/${Math.round(summary.committed.points * 100) / 100}`, detail: `${unit} done` });
  return out;
}

/** Lines of the success screen. */
export function successLines(id: string, summary: CloseSummaryLike, next: string, unit: string | undefined): string[] {
  const pts = (n: number) => (unit ? ` · ${pointsText(n, unit)}` : "");
  return [
    `${id} is closed.`,
    `Committed: ${tasks(summary.committed.tasks)}${pts(summary.committed.points)} · Done: ${summary.done.tasks}${pts(summary.done.points)}`,
    `To backlog: ${summary.toBacklog.join(", ") || "none"}`,
    `To ${next}: ${summary.toNext.join(", ") || "none"}`,
  ];
}

/** Why Confirm is disabled, or undefined when it may be pressed. */
export function confirmBlocker(s: { planning: boolean; applying: boolean; hasPlan: boolean; blockers: readonly string[] }): string | undefined {
  if (s.applying) return "Completing…";
  if (!s.hasPlan || s.planning) return "Updating the plan…";
  if (s.blockers.length) return `Cannot complete: ${s.blockers[0]}${s.blockers.length > 1 ? ` (and ${s.blockers.length - 1} more)` : ""}`;
  return undefined;
}
