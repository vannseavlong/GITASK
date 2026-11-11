import type { BoardData } from "@/host/index.ts";
import { cn } from "@/lib/utils";
import { estimateUnit, localToday, sprintRange, sprintStats, sprintTime, type SprintLite } from "@host-src/sprint-scope.ts";

/**
 * One line under the tabs while a sprint is in scope: name, goal, dates and time left, done/total tasks and points.
 * Counts use the whole board (the filters do not apply). An overdue sprint (end passed, not closed) shows in the
 * warning colour. Points are hidden when the estimate unit is `none`.
 */
export function SprintStrip({ sprint, board }: { sprint: SprintLite; board: BoardData }) {
  const cfg = board.sprints?.config;
  if (!cfg) return null;
  const today = localToday();
  const stats = sprintStats(board, sprint.id, cfg.doneColumns);
  const unit = estimateUnit(cfg.estimate);
  const range = sprintRange(sprint, today);
  const time = sprintTime(sprint, today);
  const when = [range, time.text].filter(Boolean).join(" · ");
  return (
    <div role="region" aria-label={`Sprint ${sprint.id}`} className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border bg-sidebar px-3 py-1.5 text-xs">
      <span className="font-semibold">{sprint.id} · {sprint.name}{sprint.state === "planned" && <span className="ml-1 font-normal opacity-70">(planned)</span>}</span>
      {sprint.goal && <span className="min-w-0 break-words opacity-90" title="Sprint goal">{sprint.goal}</span>}
      {when && <span className={cn("whitespace-nowrap", time.warn ? "font-semibold text-destructive" : "opacity-80")}>{when}</span>}
      <span className="ml-auto whitespace-nowrap opacity-90">
        {stats.done}/{stats.total} tasks{unit && ` · ${stats.donePoints}/${stats.points} ${unit}`}
      </span>
    </div>
  );
}
