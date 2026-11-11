import type { BoardSprints } from "gitask-core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { estimateUnit } from "@host-src/sprint-scope.ts";

/** Small sprint id and estimate badges (card, list title, detail). Nothing when sprints are off; no estimate when the unit is `none`. */
export function SprintBadges({ sprints, task, className }: { sprints: BoardSprints | undefined; task: { sprint?: string; estimate?: number } | undefined; className?: string }) {
  if (!sprints || !task) return null;
  const unit = estimateUnit(sprints.config.estimate);
  const est = unit && task.estimate !== undefined ? `${task.estimate} ${unit}` : "";
  if (!task.sprint && !est) return null;
  return (
    <span className={cn("inline-flex gap-1", className)}>
      {task.sprint && <Badge variant="outline" title={`Sprint ${task.sprint}`}>{task.sprint}</Badge>}
      {est && <Badge variant="outline" title="Estimate">{est}</Badge>}
    </span>
  );
}
