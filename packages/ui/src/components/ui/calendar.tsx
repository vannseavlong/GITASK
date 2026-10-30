import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

/** react-day-picker with its stylesheet; colours come from the theme tokens in index.css (.gitask-calendar). */
function Calendar({ className, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker showOutsideDays={showOutsideDays} className={cn("gitask-calendar p-1", className)} {...props} />;
}

export { Calendar };
