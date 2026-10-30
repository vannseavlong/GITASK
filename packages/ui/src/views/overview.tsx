import * as React from "react";
import { computeOverview, type Item } from "@host-src/views/overview-logic.ts";
import type { OverviewBoard } from "@host-src/views/overview-logic.ts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./registry.tsx";

const LIMIT = 25;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const pad = (n: number) => (n < 10 ? "0" : "") + n;
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function Tile({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className={cn("min-w-32 rounded-md border border-border bg-sidebar px-3.5 py-2.5", warn && n > 0 && "border-destructive")}>
      <div className="text-2xl font-semibold">{n}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: { key: string; label: string; count: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="min-w-0 rounded-md border border-border bg-sidebar p-2.5" aria-label={title}>
      <h3 className="mb-2 text-xs uppercase opacity-85">{title}</h3>
      {rows.map((r) => (
        <div key={r.key} className="my-1 flex items-center gap-2 text-xs">
          <span className="basis-[38%] truncate" title={r.label}>{r.label}</span>
          <Progress value={(100 * r.count) / max} color={r.color} className="h-2 flex-1" />
          <span className="min-w-[2ch] text-right font-semibold">{r.count}</span>
        </div>
      ))}
    </section>
  );
}

function ItemList({ id, title, items, none, detail, all, onToggleAll, openTask }: {
  id: string; title: string; items: Item[]; none: string; detail: (i: Item) => string;
  all: boolean; onToggleAll: () => void; openTask: (p: string) => void;
}) {
  const shown = all ? items : items.slice(0, LIMIT);
  return (
    <section className="min-w-0 rounded-md border border-border bg-sidebar p-2.5" aria-label={title}>
      <h3 className="mb-2 text-xs uppercase opacity-85">{title} ({items.length})</h3>
      {items.length === 0 ? (
        <div className="py-1 text-xs opacity-70">{none}</div>
      ) : (
        <ul className="m-0 list-none p-0">
          {shown.map((it) => (
            <li key={`${id}-${it.path}`}>
              <button
                type="button"
                className="block w-full rounded-sm px-1.5 py-1 text-left outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => openTask(it.path)}
              >
                <span className="block break-words">{it.title}</span>
                <span className="block text-[11px] opacity-75">{detail(it)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > LIMIT && (
        <Button variant="secondary" size="sm" className="mt-1.5" onClick={onToggleAll}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </Button>
      )}
    </section>
  );
}

export function OverviewView({ board, ui, update, openTask }: ViewProps) {
  const staleDays = typeof board.settings?.staleDays === "number" ? board.settings.staleDays : 14;
  const o = React.useMemo(
    () => computeOverview(board as unknown as OverviewBoard, { today: localToday(), staleDays }),
    [board, staleDays],
  );
  const allMap = ui.overview?.all ?? {};
  const toggle = (id: string) => update({ overview: { ...ui.overview, all: { ...allMap, [id]: !allMap[id] } } });
  if (o.total === 0) return <div className="p-3 py-6 opacity-70">No tasks yet.</div>;
  const colorOf = new Map(board.columns.map((c) => [c.id, c.color]));
  const lists = [
    { id: "overdue", title: "Overdue", items: o.overdue, none: "Nothing is overdue.", detail: (i: Item) => `due ${i.date}, ${plural(i.days ?? 0, "day")} late` },
    { id: "stale", title: `Not updated for ${o.staleDays}+ days`, items: o.stale, none: "Nothing is stale.", detail: (i: Item) => `updated ${i.date}, ${plural(i.days ?? 0, "day")} ago` },
    { id: "claimed", title: "Claimed", items: o.claimed, none: "No task is claimed.", detail: (i: Item) => `claimed by ${i.claimedBy}` },
    { id: "recent", title: "Recently updated", items: o.recent, none: "No dated tasks.", detail: (i: Item) => `updated ${i.date} in ${i.column}` },
  ];
  return (
    <div className="space-y-4 p-3">
      <div className="flex flex-wrap gap-2.5">
        <Tile n={o.total} label="tasks" />
        <Tile n={o.overdue.length} label="overdue" warn />
        <Tile n={o.stale.length} label={`not updated for ${o.staleDays}+ days`} warn />
        <Tile n={o.claimed.length} label="claimed" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-4">
        <Bars title="By status" rows={o.byStatus.map((r) => ({ key: r.id, label: r.label, count: r.count, color: colorOf.get(r.id) }))} />
        <Bars title="By tier" rows={o.byTier.map((r) => ({ key: r.key, label: r.key === "none" ? "no tier" : r.key, count: r.count }))} />
        <Bars title="By owner" rows={o.byOwner.map((r) => ({ key: r.key, label: r.key, count: r.count }))} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-4">
        {lists.map((l) => (
          <ItemList key={l.id} {...l} all={!!allMap[l.id]} onToggleAll={() => toggle(l.id)} openTask={openTask} />
        ))}
      </div>
      {o.undated > 0 && <div className="text-xs opacity-70">{plural(o.undated, "open task")} without an updated date are not counted as stale.</div>}
    </div>
  );
}
