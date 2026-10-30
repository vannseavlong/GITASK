import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root data-slot="tabs" className={cn("flex min-h-0 flex-1 flex-col", className)} {...props} />
);
const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List data-slot="tabs-list" className={cn("flex shrink-0 items-end gap-0.5 border-b border-border px-3 pt-1.5", className)} {...props} />
);
const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn("border-b-2 border-transparent px-3 py-1.5 text-sm opacity-75 outline-none hover:bg-accent hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring data-[state=active]:border-ring data-[state=active]:opacity-100", className)}
    {...props}
  />
);
const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-h-0 flex-1 overflow-auto outline-none", className)} {...props} />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
