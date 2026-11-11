// Pure sprint scope shared by every view: which tasks the sprint switcher keeps, and the numbers on the sprint strip.
// No `vscode`, no DOM; the UI imports it as is. Types are structural so the webview never imports node-only core code.

export interface SprintLite { id: string; name: string; state: "planned" | "active" | "closed"; start?: string; end?: string; goal?: string; capacity?: number }
export interface SprintsLite { config: { doneColumns: readonly string[]; estimate: "points" | "hours" | "none" }; list: readonly SprintLite[]; active?: string; warnings?: readonly string[] }
export interface ScopedTask { sprint?: string; estimate?: number }
export interface ScopedBoard<T extends ScopedTask = ScopedTask> { columns: { id: string; tasks: T[] }[] }

/** What the switcher saved in `UiState.sprintScope`: `all`, `active`, `backlog` or a sprint id. Missing means the default. */
export type SprintScopeValue = string | undefined;

/**
 * The scope after checking it against the board. `off`: sprints are not on (nothing is filtered or shown).
 * `value` is what the switcher shows selected (`active` when the active sprint was reached through the default).
 */
export type ResolvedScope =
  | { kind: "off" }
  | { kind: "all"; value: "all" }
  | { kind: "backlog"; value: "backlog" }
  | { kind: "sprint"; value: string; sprint: SprintLite };

/**
 * Default (nothing saved) and `active` mean the active sprint, or All when none is active. A sprint id must name a
 * sprint in the list; an unknown or deleted id falls back to All. Without sprints the scope is `off`.
 */
export function resolveScope(saved: SprintScopeValue, sprints: SprintsLite | undefined): ResolvedScope {
  if (!sprints) return { kind: "off" };
  const find = (id: string | undefined) => (id ? sprints.list.find((s) => s.id === id) : undefined);
  if (saved === undefined || saved === "active") {
    const active = find(sprints.active);
    return active ? { kind: "sprint", value: "active", sprint: active } : { kind: "all", value: "all" };
  }
  if (saved === "backlog") return { kind: "backlog", value: "backlog" };
  const picked = saved === "all" ? undefined : find(saved);
  return picked ? { kind: "sprint", value: picked.id === sprints.active ? "active" : picked.id, sprint: picked } : { kind: "all", value: "all" };
}

/** True when the scope hides some tasks (a sprint or the backlog), so the filter bar counts it. */
export const scopeNarrows = (s: ResolvedScope): boolean => s.kind === "sprint" || s.kind === "backlog";

/** A task in this scope. Backlog = no `Sprint` header and not in a done column. */
export function inScope(t: ScopedTask, column: string, s: ResolvedScope, doneColumns: readonly string[]): boolean {
  if (s.kind === "sprint") return t.sprint === s.sprint.id;
  if (s.kind === "backlog") return !t.sprint && !doneColumns.includes(column);
  return true;
}

/** A copy of the board keeping only the tasks in scope; the same object back when the scope keeps everything. */
export function scopeBoard<B extends ScopedBoard>(board: B, s: ResolvedScope, sprints: SprintsLite | undefined): B {
  if (!scopeNarrows(s) || !sprints) return board;
  const done = sprints.config.doneColumns;
  return { ...board, columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((t) => inScope(t, c.id, s, done)) })) };
}

export interface SprintStats { total: number; done: number; points: number; donePoints: number }

/** Tasks and estimate sums of one sprint over the whole board (filters do not apply). Missing estimates count as 0. */
export function sprintStats(board: ScopedBoard, sprintId: string, doneColumns: readonly string[]): SprintStats {
  const out: SprintStats = { total: 0, done: 0, points: 0, donePoints: 0 };
  for (const c of board.columns) {
    const isDone = doneColumns.includes(c.id);
    for (const t of c.tasks) {
      if (t.sprint !== sprintId) continue;
      const e = t.estimate ?? 0;
      out.total++;
      out.points += e;
      if (isDone) { out.done++; out.donePoints += e; }
    }
  }
  out.points = round2(out.points);
  out.donePoints = round2(out.donePoints);
  return out;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Unit suffix for an estimate (`pts`, `h`), or `undefined` when estimates are hidden (`none`). */
export function estimateUnit(estimate: SprintsLite["config"]["estimate"]): string | undefined {
  return estimate === "points" ? "pts" : estimate === "hours" ? "h" : undefined;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;
const utc = (iso: string): number => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** `Nov 16` from `2026-11-16`; the year is added when it differs from `today`'s. */
export function shortDate(iso: string, today: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${y !== Number(today.slice(0, 4)) ? `, ${y}` : ""}`;
}

/** `Nov 16 – Nov 29`, one side alone, or `""` when the sprint has no dates. */
export function sprintRange(s: Pick<SprintLite, "start" | "end">, today: string): string {
  if (s.start && s.end) return `${shortDate(s.start, today)} – ${shortDate(s.end, today)}`;
  if (s.start) return `from ${shortDate(s.start, today)}`;
  if (s.end) return `until ${shortDate(s.end, today)}`;
  return "";
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Time left as shown on the strip. `warn` is true when the end has passed and the sprint is not closed (overdue).
 * `today` is the local `YYYY-MM-DD`.
 */
export function sprintTime(s: Pick<SprintLite, "state" | "start" | "end">, today: string): { text: string; warn: boolean } {
  if (s.state === "closed") return { text: "closed", warn: false };
  if (s.state === "planned" && s.start && s.start > today) return { text: `starts in ${plural(Math.round((utc(s.start) - utc(today)) / DAY), "day")}`, warn: false };
  if (!s.end) return { text: s.state === "planned" ? "not started" : "", warn: false };
  const left = Math.round((utc(s.end) - utc(today)) / DAY);
  if (left > 0) return { text: `${plural(left, "day")} left`, warn: false };
  if (left === 0) return { text: "last day", warn: false };
  return { text: `ended ${plural(-left, "day")} ago`, warn: true };
}

/** Label of a sprint in the switcher: `S7 · Sprint 7`, with `(closed)` or `(planned)` when not active. */
export function sprintLabel(s: Pick<SprintLite, "id" | "name" | "state">): string {
  return `${s.id} · ${s.name}${s.state === "active" ? "" : ` (${s.state})`}`;
}

const pad = (n: number): string => (n < 10 ? "0" : "") + n;
/** Local `YYYY-MM-DD` for a date (now by default). */
export function localToday(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
