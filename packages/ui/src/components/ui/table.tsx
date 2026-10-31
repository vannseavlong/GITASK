import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />;
}
const TableHeader = (p: React.ComponentProps<"thead">) => <thead data-slot="table-header" {...p} />;
const TableBody = (p: React.ComponentProps<"tbody">) => <tbody data-slot="table-body" {...p} />;
const TableRow = ({ className, ...p }: React.ComponentProps<"tr">) => (
  <tr data-slot="table-row" className={cn("border-b border-border", className)} {...p} />
);
const TableHead = ({ className, ...p }: React.ComponentProps<"th">) => (
  <th data-slot="table-head" className={cn("whitespace-nowrap px-2 py-1.5 text-left text-xs font-semibold", className)} {...p} />
);
const TableCell = ({ className, ...p }: React.ComponentProps<"td">) => (
  <td data-slot="table-cell" className={cn("px-2 py-1.5 align-middle", className)} {...p} />
);
const TableCaption = ({ className, ...p }: React.ComponentProps<"caption">) => (
  <caption data-slot="table-caption" className={cn("sr-only", className)} {...p} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
