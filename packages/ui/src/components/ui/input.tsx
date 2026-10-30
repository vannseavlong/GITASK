import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("h-7 w-full min-w-0 rounded-sm border border-input bg-input px-2 text-sm text-input-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50", className)}
      {...props}
    />
  );
}

export { Input };
