import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export interface DayRange { from: string; to: string }

/** Range picker: one popover with a two-month calendar. Replaces two native date inputs. */
function DateRangePicker({ value, onChange, label = "Date range" }: { value: DayRange; onChange: (r: DayRange) => void; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const from = parseDay(value.from);
  const to = parseDay(value.to);
  const selected: DateRange | undefined = from || to ? { from, to } : undefined;
  const text = value.from || value.to ? `${value.from || "…"}  to  ${value.to || "…"}` : "Pick dates";
  return (
    <div className="inline-flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" aria-label={label} className="font-normal">
            <CalendarIcon />
            {text}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={from ?? to}
            selected={selected}
            onSelect={(r) => onChange({ from: r?.from ? formatDay(r.from) : "", to: r?.to ? formatDay(r.to) : "" })}
          />
        </PopoverContent>
      </Popover>
      {(value.from || value.to) && (
        <Button variant="ghost" size="icon" className="size-6" aria-label="Clear dates" onClick={() => onChange({ from: "", to: "" })}>
          <X />
        </Button>
      )}
    </div>
  );
}

export { DateRangePicker };
