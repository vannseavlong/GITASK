import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const Command = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) => (
  <CommandPrimitive data-slot="command" className={cn("flex w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)} {...props} />
);

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex items-center gap-2 border-b border-border px-2">
      <Search className="size-4 shrink-0 opacity-60" />
      <CommandPrimitive.Input data-slot="command-input" className={cn("h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground", className)} {...props} />
    </div>
  );
}
const CommandList = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List data-slot="command-list" className={cn("max-h-64 overflow-y-auto overflow-x-hidden", className)} {...props} />
);
const CommandEmpty = (props: React.ComponentProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty data-slot="command-empty" className="py-4 text-center text-sm text-muted-foreground" {...props} />
);
const CommandGroup = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group data-slot="command-group" className={cn("overflow-hidden p-1 text-foreground", className)} {...props} />
);
const CommandItem = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground", className)}
    {...props}
  />
);

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem };
