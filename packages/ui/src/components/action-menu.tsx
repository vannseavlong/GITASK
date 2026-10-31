import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Vertical three-dots menu with Edit and Delete. It sits inside clickable cards and rows, so every event it
 * handles stops there (the menu is portaled, but React still bubbles its events to the card).
 */
export function ActionMenu({ label, onEdit, onDelete, className }: { label: string; onEdit: () => void; onDelete: () => void; className?: string }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          draggable={false}
          aria-label={`Actions for ${label}`}
          data-testid="action-menu"
          className={cn("grid size-6 shrink-0 place-items-center rounded-sm opacity-60 outline-none hover:bg-accent hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:opacity-100", className)}
          onClick={stop}
          onKeyDown={stop}
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={stop} onKeyDown={stop} onCloseAutoFocus={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onEdit}><Pencil />Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
