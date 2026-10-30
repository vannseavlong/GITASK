import { Button } from "@/components/ui/button";
import type { BoardData, UiState } from "@/host/index.ts";
import { cn } from "@/lib/utils";
import { SV } from "./logic.ts";

/** Show or hide statuses (columns). One hidden set for every tab. */
export function StatusBar({ raw, ui, onChange }: { raw: BoardData | null; ui: UiState; onChange: (p: Partial<UiState>) => void }) {
  if (!raw || !raw.columns.length) return null;
  const hidden = ui.hiddenStatuses;
  const sum = SV.summary(raw, hidden);
  return (
    <>
      <div role="group" aria-label="Show or hide statuses" className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs">
        <span className="opacity-80">Statuses:</span>
        {SV.chips(raw, hidden).map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={!c.hidden}
            title={(c.hidden ? "Show " : "Hide ") + c.label}
            onClick={() => onChange({ hiddenStatuses: SV.toggle(hidden, c.id, raw) })}
            className={cn("rounded-full border border-border px-2 py-px outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring", c.hidden && "line-through opacity-55")}
          >
            {c.label} {c.count}
          </button>
        ))}
        {sum.filtered && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onChange({ hiddenStatuses: [] })}>Show all</Button>
            <span className="ml-auto opacity-80">
              Filtered: {sum.shown} of {sum.total} statuses shown, {sum.hiddenTasks} {sum.hiddenTasks === 1 ? "task" : "tasks"} hidden
            </span>
          </>
        )}
      </div>
      {sum.allHidden && <div role="status" className="px-3 py-6 opacity-75">All statuses are hidden. Click a status above, or Show all.</div>}
    </>
  );
}
