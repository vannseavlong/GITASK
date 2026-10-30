// Pure data for the Overview charts. No `vscode` import; the UI imports it as is.
// Dates are `YYYY-MM-DD`; `today` is injected so tests are deterministic.

import { ownerIs, type PersonLite } from "../people-filter.ts";

export interface ChartTask {
  owner?: string;
  fields: Record<string, string>;
  subtasks?: readonly { assignee?: string }[];
}
export interface ChartBoard {
  columns: { id: string; tasks: ChartTask[] }[];
}

const DAY = 86400000;
const bare = (id: string): string => String(id).replace(/^\d+-/, "").toLowerCase();

/** Real calendar date to a UTC day number, or NaN. */
export function dayNumber(s: unknown): number {
  const m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
  if (!m) return NaN;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const b = new Date(t);
  if (b.getUTCFullYear() !== Number(m[1]) || b.getUTCMonth() !== Number(m[2]) - 1 || b.getUTCDate() !== Number(m[3])) return NaN;
  return Math.round(t / DAY);
}
export function dayString(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}
/** Day number of the Monday that starts the week containing day `n`. */
const mondayOf = (n: number): number => n - ((new Date(n * DAY).getUTCDay() + 6) % 7);

function updatedOf(t: ChartTask): string | undefined {
  const raw = t.fields ? t.fields["started / updated"] || t.fields["updated"] || "" : "";
  const found = String(raw).match(/\d{4}-\d{2}-\d{2}/g);
  if (!found) return undefined;
  for (let i = found.length - 1; i >= 0; i--) if (!isNaN(dayNumber(found[i]))) return found[i];
  return undefined;
}

export interface WeekCount { start: string; count: number }

/**
 * Tasks in a finished column (done or deploy) by the week of their last updated date, Monday-based,
 * `weeks` weeks ending with the week of `today`. Oldest first. Tasks without a date are not counted.
 */
export function completedPerWeek(board: ChartBoard | null | undefined, today: string, weeks = 12): WeekCount[] {
  const t = dayNumber(today);
  if (isNaN(t) || weeks < 1) return [];
  const cols = board && Array.isArray(board.columns) ? board.columns : [];
  const named = cols.some((c) => bare(c.id) === "done" || bare(c.id) === "deploy");
  const last = mondayOf(t);
  const out: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ start: dayString(last - 7 * i), count: 0 });
  cols.forEach((c, ci) => {
    const finished = named ? bare(c.id) === "done" || bare(c.id) === "deploy" : cols.length > 1 && ci === cols.length - 1;
    if (!finished) return;
    for (const task of c.tasks || []) {
      const u = updatedOf(task);
      if (!u) continue;
      const w = mondayOf(dayNumber(u));
      const slot = (w - (last - 7 * (weeks - 1))) / 7;
      if (slot >= 0 && slot < weeks && Number.isInteger(slot)) out[slot].count++;
    }
  });
  return out;
}

export interface PersonCount { key: string; name: string; github?: string; count: number }

/**
 * Tasks per person: a task counts once for its owner and once for each distinct sub-task assignee.
 * Names are matched to `people` (id, name or GitHub login, any case); unknown names stay as written.
 * Tasks with neither owner nor assignee count under "unassigned". Largest first; beyond `limit`
 * the rest fold into one "Other" row.
 */
export function tasksPerPerson(board: ChartBoard | null | undefined, people: readonly PersonLite[] = [], limit = 8): PersonCount[] {
  const rows = new Map<string, PersonCount>();
  const bump = (set: Set<string>, who: string | undefined) => {
    const w = (who ?? "").trim();
    if (!w) return;
    const p = people.find((x) => ownerIs(w, x) || x.id === w.toLowerCase());
    const key = p ? p.id : "~" + w.toLowerCase();
    if (set.has(key)) return;
    set.add(key);
    const row = rows.get(key) ?? { key, name: p ? p.name : w, ...(p?.github ? { github: p.github } : {}), count: 0 };
    row.count++;
    rows.set(key, row);
  };
  for (const c of board && Array.isArray(board.columns) ? board.columns : []) {
    for (const t of c.tasks || []) {
      const seen = new Set<string>();
      bump(seen, t.owner);
      for (const s of t.subtasks || []) bump(seen, s.assignee);
      if (seen.size === 0) {
        const row = rows.get("~unassigned") ?? { key: "~unassigned", name: "unassigned", count: 0 };
        row.count++;
        rows.set("~unassigned", row);
      }
    }
  }
  const sorted = [...rows.values()].sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);
  return [...head, { key: "~other", name: `Other (${rest.length})`, count: rest.reduce((n, r) => n + r.count, 0) }];
}

export interface HeatCell { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }
export interface Heatmap {
  /** Columns are weeks (Sunday first, like GitHub); each has 7 slots, `null` outside the range. */
  weeks: (HeatCell | null)[][];
  /** Column index where a month label goes (the first week whose first visible day starts a month). */
  months: { col: number; label: string }[];
  total: number;
  max: number;
  from: string;
  to: string;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last 12 months up to and including `today` as a week-by-weekday grid with 5 colour levels. */
export function heatmap(activity: readonly { date: string; count: number }[] | null | undefined, today: string, days = 365): Heatmap | null {
  const t = dayNumber(today);
  if (isNaN(t)) return null;
  const counts = new Map<number, number>();
  for (const a of activity || []) {
    const n = dayNumber(a?.date);
    if (!isNaN(n) && Number.isFinite(a.count) && a.count > 0) counts.set(n, (counts.get(n) ?? 0) + Math.floor(a.count));
  }
  const first = t - (days - 1);
  const gridStart = first - new Date(first * DAY).getUTCDay(); // back to the Sunday
  let max = 0, total = 0;
  for (let n = first; n <= t; n++) { const c = counts.get(n) ?? 0; total += c; if (c > max) max = c; }
  const level = (c: number): HeatCell["level"] => (c <= 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((4 * c) / max))) as HeatCell["level"]));
  const weeks: (HeatCell | null)[][] = [];
  const months: Heatmap["months"] = [];
  let lastMonth = -1;
  for (let w = gridStart; w <= t; w += 7) {
    const col: (HeatCell | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const n = w + d;
      if (n < first || n > t) { col.push(null); continue; }
      const c = counts.get(n) ?? 0;
      col.push({ date: dayString(n), count: c, level: level(c) });
    }
    const firstCell = col.find((c) => c);
    if (firstCell) {
      const mo = Number(firstCell.date.slice(5, 7)) - 1;
      // A label needs room: skip a month that begins in the last two columns of the grid.
      if (mo !== lastMonth) { months.push({ col: weeks.length, label: MONTHS[mo] }); lastMonth = mo; }
    }
    weeks.push(col);
  }
  // The first column is a partial week whose month label would collide with the next one.
  if (months.length > 1 && months[1].col - months[0].col < 2) months.shift();
  return { weeks, months, total, max, from: dayString(first), to: today };
}
