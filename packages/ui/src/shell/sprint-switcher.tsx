import { AlertTriangle } from "lucide-react";
import type { BoardSprints } from "gitask-core";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UiState } from "@/host/index.ts";
import { sprintLabel, type ResolvedScope } from "@host-src/sprint-scope.ts";

/**
 * Sprint switcher in the shared filter bar: Active sprint, a chosen sprint, Backlog or All. Scopes every view.
 * Drawn only when the board has sprints; problems found while reading sprints (two active) show as a quiet icon.
 */
export function SprintSwitcher({ scope, sprints, onChange }: { scope: ResolvedScope; sprints: BoardSprints | undefined; onChange: (p: Partial<UiState>) => void }) {
  if (!sprints || scope.kind === "off") return null;
  const active = sprints.list.find((s) => s.id === sprints.active);
  const others = sprints.list.filter((s) => s.id !== active?.id).slice().reverse(); // newest first
  const warnings = sprints.warnings ?? [];
  return (
    <span className="inline-flex items-center gap-1">
      <span>Sprint:</span>
      <Select value={scope.value} onValueChange={(v) => onChange({ sprintScope: v })}>
        <SelectTrigger aria-label="Sprint scope" className="h-6 max-w-56 text-xs [&>span]:truncate"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {active && <SelectItem value="active">Active: {sprintLabel(active)}</SelectItem>}
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="all">All tasks</SelectItem>
          </SelectGroup>
          {others.length > 0 && (
            <SelectGroup className="mt-1 border-t border-border pt-1">
              {others.map((s) => <SelectItem key={s.id} value={s.id}>{sprintLabel(s)}</SelectItem>)}
            </SelectGroup>
          )}
          {sprints.list.length === 0 && <div className="px-2 py-1 text-xs opacity-70">No sprints yet. Add one in Tasks/_sprints/.</div>}
        </SelectContent>
      </Select>
      {warnings.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span role="img" tabIndex={0} aria-label={`Sprint warning: ${warnings.join("; ")}`} className="inline-flex rounded-sm text-destructive outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <AlertTriangle className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{warnings.join("; ")}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
