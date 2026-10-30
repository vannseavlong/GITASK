import * as React from "react";
import type { Heatmap, PersonCount, WeekCount } from "@host-src/views/charts-logic.ts";

/** Fixed categorical slots: a series keeps its colour whatever the filters hide. Values live in index.css. */
export const slot = (i: number): string => `var(--chart-${(i % 8) + 1})`;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string) => `${MON[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

interface Tip { text: string; x: number; y: number }

/** A hover tooltip positioned inside a `relative` box. Native pointer events; the data is also in each mark's aria-label. */
function useTip() {
  const [tip, setTip] = React.useState<Tip | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const show = (text: string) => (e: React.PointerEvent | React.FocusEvent) => {
    const box = ref.current?.getBoundingClientRect();
    const r = (e.currentTarget as Element).getBoundingClientRect();
    if (box) setTip({ text, x: r.left - box.left + r.width / 2, y: r.top - box.top });
  };
  const hide = () => setTip(null);
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
      style={{ left: tip.x, top: tip.y - 6 }}
    >
      {tip.text}
    </div>
  );
  return { ref, show, hide, node };
}

function ChartCard({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-md border border-border bg-sidebar p-2.5" aria-label={title}>
      <h3 className="mb-2 text-xs uppercase opacity-85">{title}</h3>
      {children}
      {caption && <p className="mt-2 text-[11px] opacity-70">{caption}</p>}
    </section>
  );
}

/** The chart's numbers as a table for screen readers; the picture is `role="img"` with a one-line summary. */
function DataTable({ caption, head, rows }: { caption: string; head: [string, string]; rows: [string, number][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">{head[0]}</th><th scope="col">{head[1]}</th></tr></thead>
      <tbody>{rows.map(([a, b]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>)}</tbody>
    </table>
  );
}

export interface Slice { key: string; label: string; count: number; color: string }

const R = 40, C = 2 * Math.PI * R;

/** Donut with the total in the middle and a legend that carries label, count and share (never colour alone). */
export function Donut({ title, slices, empty }: { title: string; slices: Slice[]; empty: string }) {
  const shown = slices.filter((s) => s.count > 0);
  const total = shown.reduce((n, s) => n + s.count, 0);
  const tip = useTip();
  const summary = total === 0 ? `${title}: ${empty}` : `${title}: ${shown.map((s) => `${s.label} ${s.count}`).join(", ")}`;
  let acc = 0;
  return (
    <ChartCard title={title}>
      {total === 0 ? (
        <div className="py-3 text-xs opacity-70">{empty}</div>
      ) : (
        <div ref={tip.ref} className="relative flex flex-wrap items-center gap-4">
          <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" className="size-32 -rotate-90" role="img" aria-label={summary}>
            {shown.length === 1 ? (
              <circle cx="50" cy="50" r={R} fill="none" stroke={shown[0].color} strokeWidth="14" aria-label={`${shown[0].label}: ${shown[0].count}`} />
            ) : (
              shown.map((s) => {
                const len = (s.count / total) * C;
                const el = (
                  <circle
                    key={s.key} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="14"
                    strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-acc}
                    aria-label={`${s.label}: ${s.count}`}
                    onPointerEnter={tip.show(`${s.label}: ${plural(s.count, "task")} (${Math.round((100 * s.count) / total)}%)`)} onPointerLeave={tip.hide}
                  />
                );
                acc += len;
                return el;
              })
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="text-xl font-semibold leading-none">{total}</span>
            <span className="text-[11px] opacity-70">tasks</span>
          </div>
          </div>
          <ul className="m-0 min-w-0 flex-1 list-none space-y-1 p-0 text-xs">
            {shown.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate" title={s.label}>{s.label}</span>
                <span className="font-semibold">{s.count}</span>
                <span className="w-9 text-right opacity-70">{Math.round((100 * s.count) / total)}%</span>
              </li>
            ))}
          </ul>
          {tip.node}
        </div>
      )}
      <DataTable caption={summary} head={["Name", "Tasks"]} rows={shown.map((s) => [s.label, s.count])} />
    </ChartCard>
  );
}

/** Horizontal bars, one per person: name, bar, count. Single series, so one colour and no legend. */
export function PersonBars({ title, rows, empty }: { title: string; rows: PersonCount[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const tip = useTip();
  const summary = rows.length === 0 ? `${title}: ${empty}` : `${title}: ${rows.map((r) => `${r.name} ${r.count}`).join(", ")}`;
  return (
    <ChartCard title={title} caption="A task counts for its owner and for each sub-task assignee.">
      {rows.length === 0 ? (
        <div className="py-3 text-xs opacity-70">{empty}</div>
      ) : (
        <div ref={tip.ref} className="relative" role="img" aria-label={summary}>
          {rows.map((r) => (
            <div
              key={r.key} className="my-1 flex items-center gap-2 text-xs"
              onPointerEnter={tip.show(`${r.name}${r.github ? ` (@${r.github})` : ""}: ${plural(r.count, "task")}`)} onPointerLeave={tip.hide}
            >
              <span className="basis-[34%] truncate" title={r.github ? `${r.name} (@${r.github})` : r.name}>{r.name}</span>
              <span className="h-3 flex-1" aria-hidden="true">
                <span className="block h-full rounded-r-[4px]" style={{ width: `${(100 * r.count) / max}%`, minWidth: 2, background: slot(0) }} />
              </span>
              <span className="min-w-[2ch] text-right font-semibold">{r.count}</span>
            </div>
          ))}
          {tip.node}
        </div>
      )}
      <DataTable caption={summary} head={["Person", "Tasks"]} rows={rows.map((r) => [r.name, r.count])} />
    </ChartCard>
  );
}

/** Column chart: tasks completed per week. One y-scale, a gridline at 0 and the max, labels on every other week. */
export function WeekBars({ title, weeks, empty }: { title: string; weeks: WeekCount[]; empty: string }) {
  const total = weeks.reduce((n, w) => n + w.count, 0);
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const tip = useTip();
  const summary = total === 0 ? `${title}: ${empty}` : `${title}: ${weeks.map((w) => `week of ${w.start} ${w.count}`).join(", ")}`;
  const W = 360, H = 140, L = 22, B = 22, T = 8;
  const step = (W - L) / Math.max(1, weeks.length), bw = Math.min(22, step - 6);
  const y = (n: number) => T + (H - T - B) * (1 - n / max);
  return (
    <ChartCard title={title} caption="Tasks now in a finished column, by the week of their last updated date.">
      {total === 0 ? (
        <div className="py-3 text-xs opacity-70">{empty}</div>
      ) : (
        <div ref={tip.ref} className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
            {[0, max].map((v) => (
              <g key={v}>
                <line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
                <text x={L - 4} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-muted-foreground text-[9px]">{v}</text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const x = L + i * step + (step - bw) / 2;
              const label = `Week of ${prettyDate(w.start)}: ${plural(w.count, "task")} completed`;
              return (
                <g key={w.start} onPointerEnter={tip.show(label)} onPointerLeave={tip.hide} aria-label={label}>
                  <rect x={L + i * step} y={T} width={step} height={H - T - B} fill="transparent" />
                  {w.count > 0 && <path d={`M${x},${H - B} V${y(w.count) + 4} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 V${H - B} Z`} fill={slot(0)} aria-hidden="true" />}
                  {i % 2 === (weeks.length - 1) % 2 && (
                    <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[9px]">{`${MON[Number(w.start.slice(5, 7)) - 1]} ${Number(w.start.slice(8, 10))}`}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {tip.node}
        </div>
      )}
      <DataTable caption={summary} head={["Week starting", "Completed"]} rows={weeks.map((w) => [w.start, w.count])} />
    </ChartCard>
  );
}

const CELL = 11, GAP = 3, LEFT = 28, TOP = 16;

/** GitHub-style contribution grid: weeks are columns, weekdays rows (Mon, Wed, Fri labelled). */
export function ActivityHeatmap({ heat }: { heat: Heatmap | null }) {
  const tip = useTip();
  const cols = heat?.weeks.length ?? 0;
  const W = LEFT + cols * (CELL + GAP), H = TOP + 7 * (CELL + GAP);
  const summary = !heat || heat.total === 0
    ? "Activity heatmap: no task changes in the last 12 months."
    : `Activity heatmap: ${plural(heat.total, "change")} between ${heat.from} and ${heat.to}, at most ${heat.max} on one day.`;
  const text = (c: { date: string; count: number }) => `${c.count === 0 ? "No" : c.count} ${c.count === 1 ? "change" : "changes"} on ${prettyDate(c.date)}`;
  return (
    <ChartCard title="Activity" caption="Commits that changed a task file, per day, over the last 12 months. Always the full year; the filters above do not apply.">
      {!heat || heat.total === 0 ? (
        <div className="py-3 text-xs opacity-70">No task changes in git history for the last 12 months.</div>
      ) : (
        <div ref={tip.ref} className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-none" role="img" aria-label={summary}>
            {heat.months.map((m) => (
              <text key={m.col} x={LEFT + m.col * (CELL + GAP)} y={10} className="fill-muted-foreground text-[10px]">{m.label}</text>
            ))}
            {[1, 3, 5].map((d) => (
              <text key={d} x={0} y={TOP + d * (CELL + GAP) + CELL - 1} className="fill-muted-foreground text-[10px]">{["Mon", "Wed", "Fri"][(d - 1) / 2]}</text>
            ))}
            {heat.weeks.map((week, ci) => week.map((c, ri) => c && (
              <rect
                key={c.date} x={LEFT + ci * (CELL + GAP)} y={TOP + ri * (CELL + GAP)} width={CELL} height={CELL} rx="2"
                fill={`var(--heat-${c.level})`} aria-label={text(c)}
                onPointerEnter={tip.show(text(c))} onPointerLeave={tip.hide}
              />
            )))}
          </svg>
          {tip.node}
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-80" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className="size-[11px] rounded-[2px]" style={{ background: `var(--heat-${l})` }} />)}
        <span>More</span>
      </div>
      <DataTable
        caption={summary} head={["Date", "Changes"]}
        rows={(heat?.weeks.flat().filter((c): c is NonNullable<typeof c> => !!c && c.count > 0) ?? []).map((c) => [c.date, c.count])}
      />
    </ChartCard>
  );
}
