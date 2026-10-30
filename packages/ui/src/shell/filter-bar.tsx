import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { BoardData, UiState } from "@/host/index.ts";
import { countTasks, filterBoard, rangeActive, rangeNorm, type Range } from "./logic.ts";

/** Text filter plus the date range. The state is shared by every tab and remembered. */
export function FilterBar({ ui, range, board, onChange }: { ui: UiState; range: Range; board: BoardData | null; onChange: (p: Partial<UiState>) => void }) {
  const active = rangeActive(range);
  const total = countTasks(board);
  const shown = countTasks(filterBoard(board, range));
  return (
    <div role="group" aria-label="Filters" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-1.5 top-1.5 size-3.5 opacity-60" />
        <Input type="search" value={ui.filter ?? ""} placeholder="Filter tasks" aria-label="Filter tasks" className="w-56 pl-6" onChange={(e) => onChange({ filter: e.target.value })} />
      </div>
      <span>Date:</span>
      <Select value={range.field} onValueChange={(field) => onChange({ range: rangeNorm({ ...range, field }) })}>
        <SelectTrigger aria-label="Filter by date" className="h-6 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="due">Due</SelectItem>
          <SelectItem value="updated">Updated</SelectItem>
        </SelectContent>
      </Select>
      <DateRangePicker value={{ from: range.from, to: range.to }} onChange={(r) => onChange({ range: rangeNorm({ ...r, field: range.field }) })} />
      {active && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onChange({ range: rangeNorm({ field: range.field }) })}>Clear dates</Button>
          <span aria-live="polite" className="opacity-80">{shown} of {total} in range</span>
        </>
      )}
    </div>
  );
}
