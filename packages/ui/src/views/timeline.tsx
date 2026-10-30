import * as React from "react";
import { timelineLogic, type TLCell, type TLTask } from "@host-src/views/timeline-logic.ts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardData } from "@/host/index.ts";
import type { ViewProps } from "./registry.tsx";

const TL = timelineLogic();
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PALETTE = [
  "var(--vscode-charts-blue, #3794ff)",
  "var(--vscode-charts-purple, #b180d7)",
  "var(--vscode-charts-yellow, #cca700)",
  "var(--vscode-charts-orange, #d18616)",
  "var(--vscode-charts-green, #89d185)",
  "var(--vscode-charts-foreground, #888)",
];
const NAME_W = 200;

type Col = BoardData["columns"][number];
const colOf = (board: BoardData, id: string): { col?: Col; index: number } => {
  const i = board.columns.findIndex((c) => c.id === id);
  return { col: board.columns[i], index: Math.max(0, i) };
};
const statusOf = (board: BoardData, id: string) => colOf(board, id).col?.label ?? id;
const asTL = (t: unknown) => t as TLTask;

function Toggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant={pressed ? "default" : "secondary"} size="sm" aria-pressed={pressed} onClick={onClick}>
      {children}
    </Button>
  );
}

function Calendar({ board, tasks, year, month, today, openTask }: { board: BoardData; tasks: TLTask[]; year: number; month: number; today: number; openTask: (p: string) => void }) {
  const by = TL.dueByDay(tasks);
  const weeks = TL.monthGrid(year, month, today);
  return (
    <div role="grid" aria-label={TL.monthLabel(year, month)} className="overflow-hidden rounded-md border border-border">
      <div role="row" className="grid grid-cols-7">
        {DOW.map((d) => <div key={d} role="columnheader" className="bg-sidebar px-1.5 py-1 text-[11px] uppercase opacity-75">{d}</div>)}
      </div>
      {weeks.map((week: TLCell[], wi: number) => (
        <div key={wi} role="row" className="grid grid-cols-7">
          {week.map((cell) => (
            <div
              key={cell.iso}
              role="gridcell"
              className={cn("flex min-h-21 min-w-0 flex-col gap-0.5 border-l border-t border-border p-0.5 first:border-l-0", !cell.inMonth && "bg-sidebar opacity-50", cell.isToday && "outline-2 -outline-offset-2 outline-ring")}
            >
              <div className={cn("text-[11px] opacity-80", cell.isToday && "font-bold opacity-100")}>{Number(cell.iso.slice(8))}</div>
              {(by[cell.day] ?? []).map((t) => {
                const sp = TL.taskSpan(t, today);
                const { col } = colOf(board, t.column);
                const status = statusOf(board, t.column);
                const label = `${t.title}, ${status}, due ${cell.iso}${sp?.overdue ? ", overdue" : ""}`;
                return (
                  <button
                    key={t.path}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => openTask(t.path)}
                    className={cn(
                      "truncate rounded-sm bg-badge px-1.5 py-px text-left text-[11px] text-badge-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      sp?.done && "line-through opacity-70",
                      sp?.overdue && "border border-destructive",
                    )}
                    style={col?.color ? { borderLeft: `4px solid ${col.color}` } : undefined}
                  >
                    {sp?.overdue && <span aria-hidden="true" className="font-bold">! </span>}
                    {t.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Waterfall({ board, tasks, today, zoom, scrollKey, openTask }: { board: BoardData; tasks: TLTask[]; today: number; zoom: string; scrollKey: number; openTask: (p: string) => void }) {
  const lay = React.useMemo(() => TL.layout(tasks, today, zoom), [tasks, today, zoom]);
  const scroller = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, lay.todayX - el.clientWidth / 3);
    // Only on first draw, on a zoom change or on "Today": not on every board refresh.
  }, [zoom, scrollKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lay.bars.length) return <div className="py-4 opacity-70">No tasks with dates to draw.</div>;
  const H = lay.height;
  return (
    <div ref={scroller} className="max-h-[calc(100vh-170px)] overflow-auto rounded-md border border-border">
      <div className="flex w-max min-w-full">
        <div className="sticky left-0 z-[3] flex-none border-r border-border bg-background" style={{ width: NAME_W }}>
          <div className="sticky top-0 z-[4] box-border border-b border-border bg-background px-2 pt-5 text-[11px] uppercase opacity-75" style={{ height: lay.headH }}>Task</div>
          {lay.bars.map((b) => (
            <div key={b.path} title={b.title} className={cn("box-border truncate px-2 text-xs", b.span.overdue && "text-destructive")} style={{ height: lay.rowH, lineHeight: `${lay.rowH}px` }}>
              {b.title}
            </div>
          ))}
        </div>
        <div className="relative flex-none" style={{ width: lay.width }}>
          <svg width={lay.width} height={lay.headH} role="presentation" className="sticky top-0 z-[2] block border-b border-border bg-background">
            {lay.ticks.map((t) => (
              <g key={t.day}>
                <line x1={t.x} x2={t.x} y1={t.major ? 4 : lay.headH - 12} y2={lay.headH} stroke="currentColor" opacity={t.major ? 0.5 : 0.2} />
                <text x={t.x + 3} y={t.major ? 16 : lay.headH - 16} fontSize={10} fill="currentColor" opacity={0.8}>{t.label}</text>
              </g>
            ))}
            <line x1={lay.todayX} x2={lay.todayX} y1={0} y2={lay.headH} stroke="var(--destructive)" strokeWidth={2} />
            <text x={lay.todayX + 3} y={lay.headH - 3} fontSize={10} fontWeight={700} fill="var(--destructive)">today</text>
          </svg>
          <svg width={lay.width} height={H - lay.headH} role="list" aria-label="Task bars" className="block">
            <defs>
              <marker id="tl-arrow" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
                <path d="M0 0 L8 4 L0 8 z" fill="currentColor" opacity={0.7} />
              </marker>
            </defs>
            {lay.ticks.filter((t) => t.major).map((t) => <line key={t.day} x1={t.x} x2={t.x} y1={0} y2={H} stroke="currentColor" opacity={0.15} />)}
            {lay.bars.map((b) => b.row % 2 === 1 && <rect key={b.path} x={0} y={b.row * lay.rowH} width={lay.width} height={lay.rowH} fill="var(--sidebar)" opacity={0.6} />)}
            <g transform={`translate(0 -${lay.headH})`} aria-hidden="true">
              {lay.edges.map((e) => <path key={e.from + e.to} d={e.d} fill="none" stroke="currentColor" opacity={0.55} strokeWidth={1.2} markerEnd="url(#tl-arrow)" />)}
            </g>
            {lay.bars.map((b) => {
              const sp = b.span;
              const { col, index } = colOf(board, b.column);
              const status = statusOf(board, b.column);
              const y = b.row * lay.rowH;
              const desc = `${b.title}, ${status}, ${TL.formatDate(sp.start)} to ${sp.hasDue ? TL.formatDate(sp.end) + " due" : sp.done ? TL.formatDate(sp.end) + " last updated" : "today, no due date"}${sp.overdue ? ", overdue" : ""}${sp.dueBeforeStart ? ", due date is before start" : ""}`;
              let text = status;
              if (sp.overdue) text += " - OVERDUE";
              if (sp.dueBeforeStart) text += " - due before start";
              if (sp.openEnded) text += sp.done ? " - no due date" : " - no due date, open";
              const act = () => openTask(b.path);
              return (
                <g
                  key={b.path}
                  tabIndex={0}
                  role="listitem"
                  aria-label={desc}
                  className="group cursor-pointer outline-none"
                  onClick={act}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } }}
                >
                  <title>{desc}</title>
                  <rect
                    x={b.x} y={y + 6} width={b.w} height={lay.rowH - 12} rx={3}
                    fill={col?.color ?? PALETTE[index % PALETTE.length]}
                    fillOpacity={sp.openEnded ? 0.4 : 1}
                    stroke={sp.overdue ? "var(--destructive)" : sp.dueBeforeStart ? "#cca700" : sp.openEnded ? "currentColor" : "transparent"}
                    strokeWidth={sp.overdue ? 2.5 : sp.openEnded || sp.dueBeforeStart ? 1.5 : 0}
                    strokeDasharray={sp.dueBeforeStart ? "2 2" : sp.openEnded ? "5 3" : undefined}
                    className="group-hover:stroke-ring group-focus-visible:stroke-ring group-focus-visible:[stroke-width:2.5px]"
                  />
                  <text x={b.x + b.w + 6} y={y + lay.rowH / 2 + 4} fontSize={11} fill={sp.overdue ? "var(--destructive)" : "currentColor"} fontWeight={sp.overdue ? 700 : 400}>{text}</text>
                </g>
              );
            })}
            <line x1={lay.todayX} x2={lay.todayX} y1={0} y2={H} stroke="var(--destructive)" strokeWidth={2} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function TimelineView({ board, ui, update, openTask }: ViewProps) {
  const today = TL.todayFrom(new Date());
  const st = ui.timeline ?? {};
  const mode = st.mode === "waterfall" ? "waterfall" : "calendar";
  const zoom = st.zoom && TL.ZOOMS.includes(st.zoom) ? st.zoom : "month";
  const p = new Date(today * 86400000);
  const year = typeof st.year === "number" ? st.year : p.getUTCFullYear();
  const month = typeof st.month === "number" ? st.month : p.getUTCMonth();
  const set = (patch: Partial<NonNullable<typeof ui.timeline>>) => update({ timeline: { ...st, ...patch } });
  const [scrollKey, setScrollKey] = React.useState(0);
  const tasks = React.useMemo(() => board.columns.flatMap((c) => c.tasks).map(asTL), [board]);
  const shift = (d: number) => { const m = TL.shiftMonth(year, month, d); set({ year: m.year, month: m.month }); };
  const lay = mode === "waterfall" ? TL.layout(tasks, today, zoom) : null;
  const note = mode === "calendar" ? `no due date: ${TL.countNoDue(tasks)}` : lay && lay.unscheduled.length ? `no dates, not drawn: ${lay.unscheduled.length}` : "";

  return (
    <div className="p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Timeline mode" className="flex gap-1">
          <Toggle pressed={mode === "calendar"} onClick={() => set({ mode: "calendar" })}>Calendar</Toggle>
          <Toggle pressed={mode === "waterfall"} onClick={() => set({ mode: "waterfall" })}>Waterfall</Toggle>
        </div>
        {mode === "calendar" ? (
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => shift(-1)}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => set({ year: p.getUTCFullYear(), month: p.getUTCMonth() })}>Today</Button>
            <Button variant="secondary" size="sm" onClick={() => shift(1)}>Next</Button>
            <strong className="ml-2 min-w-32" aria-live="polite">{TL.monthLabel(year, month)}</strong>
          </div>
        ) : (
          <div role="group" aria-label="Zoom" className="flex gap-1">
            {TL.ZOOMS.map((z) => <Toggle key={z} pressed={zoom === z} onClick={() => set({ zoom: z })}>{z.charAt(0).toUpperCase() + z.slice(1)}</Toggle>)}
            <Button variant="secondary" size="sm" onClick={() => setScrollKey((k) => k + 1)}>Today</Button>
          </div>
        )}
      </div>
      <div className="mb-2 min-h-4 text-xs opacity-80">{note}</div>
      {mode === "calendar" ? (
        <Calendar board={board} tasks={tasks} year={year} month={month} today={today} openTask={openTask} />
      ) : (
        <Waterfall board={board} tasks={tasks} today={today} zoom={zoom} scrollKey={scrollKey} openTask={openTask} />
      )}
    </div>
  );
}
