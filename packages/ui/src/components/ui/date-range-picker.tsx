import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { applyDraft, clearDraft, discardDraft, formatRange, hasRange, openDraft, type DayRange } from "@/lib/range-draft";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** `YYYY-MM-DD` <-> local Date. Strings are what filter-logic and the saved state use. */
export function parseDay(v: string | undefined): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : undefined;
}
export function formatDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type { DayRange };

/** Range picker: popover with a two-month calendar and a draft. Apply commits, Esc or outside click keeps the old range. */
function DateRangePicker({ value, onChange, label = "Date range" }: { value: DayRange; onChange: (r: DayRange) => void; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DayRange>(() => openDraft(value));
  const from = parseDay(draft.from);
  const to = parseDay(draft.to);
  const selected: DateRange | undefined = from || to ? { from, to } : undefined;
  const text = hasRange(value) ? formatRange(value) : "Select date range";
  const onOpenChange = (o: boolean) => {
    setDraft(discardDraft(value));
    setOpen(o);
  };
  const apply = () => {
    onChange(applyDraft(draft));
    setOpen(false);
  };
  return (
    <div className="inline-flex items-center gap-1">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" aria-label={label} className="font-normal">
            <CalendarIcon />
            {text}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="rounded-xl p-3 shadow-lg" aria-label={label}>
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={parseDay(value.from) ?? parseDay(value.to)}
            selected={selected}
            onSelect={(r) => setDraft({ from: r?.from ? formatDay(r.from) : "", to: r?.to ? formatDay(r.to) : "" })}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDraft(clearDraft())}>Clear</Button>
            <Button size="sm" onClick={apply}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
      {hasRange(value) && (
        <Button variant="ghost" size="icon" className="size-6" aria-label="Clear dates" onClick={() => onChange({ from: "", to: "" })}>
          <X />
        </Button>
      )}
    </div>
  );
}

export { DateRangePicker };
