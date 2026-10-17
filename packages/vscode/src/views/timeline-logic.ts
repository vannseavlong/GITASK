// Pure date math and layout for the Timeline view. No `vscode` import, no DOM.
// `timelineLogic` is a self-contained factory: the webview ships `timelineLogic.toString()`
// verbatim, so the code the tests run is the code the user gets. Keep everything it needs
// INSIDE it (no module-level helpers, no imports) and avoid backticks and dollar-brace.
// Dates are calendar days (integer days since 1970-01-01, computed in UTC), never instants,
// so the machine's time zone cannot shift a day.

export interface TLTask {
  id: string;
  title: string;
  path: string;
  column: string;
  fields: Record<string, string>;
  due?: string;
  dependsOn: string[];
}

export interface TLSpan {
  id: string;
  /** First day of the bar (day number). */
  start: number;
  /** Last day of the bar, inclusive. */
  end: number;
  hasDue: boolean;
  /** No Due: the bar has no real end. */
  openEnded: boolean;
  done: boolean;
  overdue: boolean;
  /** Due is earlier than Started; the bar spans both days. */
  dueBeforeStart: boolean;
}

export interface TLBar {
  id: string;
  title: string;
  path: string;
  column: string;
  row: number;
  x: number;
  w: number;
  span: TLSpan;
}

export interface TLEdge {
  from: string;
  to: string;
  d: string;
}

export interface TLTick {
  x: number;
  label: string;
  major: boolean;
  day: number;
}

export interface TLLayout {
  minDay: number;
  maxDay: number;
  width: number;
  height: number;
  rowH: number;
  headH: number;
  todayX: number;
  ppd: number;
  bars: TLBar[];
  edges: TLEdge[];
  ticks: TLTick[];
  /** Tasks with no usable date at all: listed, not drawn. */
  unscheduled: TLTask[];
}

export interface TLCell {
  day: number;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
}

export interface TimelineLogic {
  parseDate(s: unknown): number | null;
  formatDate(day: number): string;
  dayOf(y: number, m: number, d: number): number;
  todayFrom(d: Date): number;
  isDoneColumn(column: string): boolean;
  taskSpan(t: TLTask, today: number): TLSpan | null;
  monthGrid(year: number, month: number, today: number): TLCell[][];
  shiftMonth(year: number, month: number, delta: number): { year: number; month: number };
  monthLabel(year: number, month: number): string;
  dueByDay(tasks: TLTask[]): Record<number, TLTask[]>;
  countNoDue(tasks: TLTask[]): number;
  layout(tasks: TLTask[], today: number, zoom: string): TLLayout;
  ZOOMS: string[];
}

export function timelineLogic(): TimelineLogic {
  const DAY_MS = 86400000;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const PPD: Record<string, number> = { week: 32, month: 11, quarter: 4 };
  const ROW_H = 30;
  const HEAD_H = 40;

  function dayOf(y: number, m: number, d: number): number {
    return Math.round(Date.UTC(y, m, d) / DAY_MS);
  }
  function parts(day: number): { y: number; m: number; d: number; wd: number } {
    const dt = new Date(day * DAY_MS);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate(), wd: dt.getUTCDay() };
  }
  function pad(n: number, w: number): string {
    let s = String(n);
    while (s.length < w) s = "0" + s;
    return s;
  }
  function formatDate(day: number): string {
    const p = parts(day);
    return pad(p.y, 4) + "-" + pad(p.m + 1, 2) + "-" + pad(p.d, 2);
  }
  /** Strict YYYY-MM-DD to a day number; null for anything else, including 2026-02-30. */
  function parseDate(s: unknown): number | null {
    if (typeof s !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < 1900 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const day = dayOf(y, mo - 1, d);
    return formatDate(day) === pad(y, 4) + "-" + pad(mo, 2) + "-" + pad(d, 2) ? day : null;
  }
  /** The calendar date a local Date shows, as a day number (no time zone shift). */
  function todayFrom(d: Date): number {
    return dayOf(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function isDoneColumn(column: string): boolean {
    return /^(\d+-)?(done|deploy|deployed|released|closed)$/i.test(String(column));
  }

  function taskSpan(t: TLTask, today: number): TLSpan | null {
    const f = (t.fields && t.fields["started / updated"]) || "";
    const bits = String(f).split("/");
    const started = parseDate(bits[0]);
    const updated = bits.length > 1 ? parseDate(bits[1]) : null;
    const due = parseDate(t.due);
    const done = isDoneColumn(t.column);
    let start = started !== null ? started : updated !== null ? updated : due;
    if (start === null) return null;
    let end: number;
    let dueBeforeStart = false;
    if (due !== null) {
      end = due;
      if (due < start) {
        dueBeforeStart = true;
        end = start;
        start = due;
      }
    } else if (done) {
      end = updated !== null && updated > start ? updated : start;
    } else {
      end = today > start ? today : start;
    }
    return {
      id: t.id,
      start,
      end,
      hasDue: due !== null,
      openEnded: due === null,
      done,
      overdue: due !== null && !done && due < today,
      dueBeforeStart,
    };
  }

  /** Weeks (Monday first) covering the month; always 6 rows so the grid does not jump. */
  function monthGrid(year: number, month: number, today: number): TLCell[][] {
    const first = dayOf(year, month, 1);
    const lead = (parts(first).wd + 6) % 7;
    const startDay = first - lead;
    const rows: TLCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: TLCell[] = [];
      for (let i = 0; i < 7; i++) {
        const day = startDay + w * 7 + i;
        const p = parts(day);
        row.push({ day, iso: formatDate(day), inMonth: p.y === year && p.m === month, isToday: day === today });
      }
      rows.push(row);
    }
    return rows;
  }
  function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
    const n = year * 12 + month + delta;
    return { year: Math.floor(n / 12), month: ((n % 12) + 12) % 12 };
  }
  function monthLabel(year: number, month: number): string {
    return MONTHS[month] + " " + year;
  }
  function dueByDay(tasks: TLTask[]): Record<number, TLTask[]> {
    const out: Record<number, TLTask[]> = {};
    for (const t of tasks) {
      const d = parseDate(t.due);
      if (d === null) continue;
      (out[d] || (out[d] = [])).push(t);
    }
    return out;
  }
  function countNoDue(tasks: TLTask[]): number {
    let n = 0;
    for (const t of tasks) if (parseDate(t.due) === null) n++;
    return n;
  }

  function edgePath(x1: number, y1: number, x2: number, y2: number): string {
    if (x2 >= x1 + 14) {
      const xm = x1 + 7;
      return "M" + x1 + " " + y1 + " H" + xm + " V" + y2 + " H" + x2;
    }
    // Dependent starts before the dependency ends: loop out to the right and back in from the left.
    const ym = y1 + (y2 > y1 ? 1 : -1) * (ROW_H / 2);
    return "M" + x1 + " " + y1 + " H" + (x1 + 7) + " V" + ym + " H" + (x2 - 7) + " V" + y2 + " H" + x2;
  }

  function layout(tasks: TLTask[], today: number, zoom: string): TLLayout {
    const ppd = PPD[zoom] || PPD.month;
    const items: { t: TLTask; s: TLSpan }[] = [];
    const unscheduled: TLTask[] = [];
    for (const t of tasks) {
      const s = taskSpan(t, today);
      if (s) items.push({ t, s });
      else unscheduled.push(t);
    }
    items.sort((a, b) => a.s.start - b.s.start || a.s.end - b.s.end || (a.t.id < b.t.id ? -1 : a.t.id > b.t.id ? 1 : 0));
    let lo = today;
    let hi = today;
    for (const it of items) {
      if (it.s.start < lo) lo = it.s.start;
      if (it.s.end > hi) hi = it.s.end;
    }
    // Leave room on both sides, and room to the right for the status text after a bar.
    const minDay = lo - 3;
    const maxDay = hi + Math.ceil(260 / ppd) + 3;
    const width = (maxDay - minDay + 1) * ppd;
    const byId: Record<string, TLBar> = {};
    const bars: TLBar[] = items.map((it, row) => {
      const bar: TLBar = {
        id: it.t.id,
        title: it.t.title,
        path: it.t.path,
        column: it.t.column,
        row,
        x: (it.s.start - minDay) * ppd,
        w: Math.max(6, (it.s.end - it.s.start + 1) * ppd),
        span: it.s,
      };
      byId[bar.id] = bar;
      return bar;
    });
    const edges: TLEdge[] = [];
    for (const bar of bars) {
      const t = items[bar.row].t;
      for (const dep of t.dependsOn || []) {
        const from = byId[dep];
        if (!from || from === bar) continue; // no dates, unknown id, or self reference
        const y1 = HEAD_H + from.row * ROW_H + ROW_H / 2;
        const y2 = HEAD_H + bar.row * ROW_H + ROW_H / 2;
        edges.push({ from: from.id, to: bar.id, d: edgePath(from.x + from.w, y1, bar.x, y2) });
      }
    }
    const ticks: TLTick[] = [];
    for (let day = minDay; day <= maxDay; day++) {
      const p = parts(day);
      let show = false;
      let major = false;
      let label = "";
      if (zoom === "week") {
        show = true;
        major = p.wd === 1;
        label = major ? MONTHS[p.m].slice(0, 3) + " " + p.d : String(p.d);
      } else if (zoom === "quarter") {
        show = p.d === 1;
        major = show && p.m % 3 === 0;
        label = MONTHS[p.m].slice(0, 3) + (p.m === 0 ? " " + p.y : "");
      } else {
        show = p.wd === 1;
        major = show && p.d <= 7;
        label = MONTHS[p.m].slice(0, 3) + " " + p.d;
      }
      if (show) ticks.push({ x: (day - minDay) * ppd, label, major, day });
    }
    return {
      minDay,
      maxDay,
      width,
      height: HEAD_H + Math.max(1, bars.length) * ROW_H,
      rowH: ROW_H,
      headH: HEAD_H,
      todayX: (today - minDay) * ppd + ppd / 2,
      ppd,
      bars,
      edges,
      ticks,
      unscheduled,
    };
  }

  return { parseDate, formatDate, dayOf, todayFrom, isDoneColumn, taskSpan, monthGrid, shiftMonth, monthLabel, dueByDay, countNoDue, layout, ZOOMS: ["week", "month", "quarter"] };
}
