import * as React from "react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { moveTo, sameOrder, shift } from "@/lib/view-order.ts";

export interface TabItem { id: string; label: string }

/**
 * The tab strip. Tabs reorder by native HTML5 drag (same approach as the board) or by Alt+Left / Alt+Right
 * on a focused tab. `items` is already in the resolved order (every id once); `onOrder` receives the new order.
 */
export function ViewTabs({ items, defaultOrder, onOrder }: { items: readonly TabItem[]; defaultOrder: readonly string[]; onOrder: (order: string[]) => void }) {
  const ids = items.map((i) => i.id);
  const dragId = React.useRef<string | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<{ id: string; where: "before" | "after" } | null>(null);
  const refs = React.useRef(new Map<string, HTMLButtonElement>());

  const end = () => { dragId.current = null; setDragging(null); setOver(null); };

  return (
    <TabsList aria-label="Views">
      {items.map((v) => (
        <TabsTrigger
          key={v.id}
          value={v.id}
          ref={(el: HTMLButtonElement | null) => { if (el) refs.current.set(v.id, el); else refs.current.delete(v.id); }}
          draggable
          title="Drag, or press Alt+Left / Alt+Right, to reorder"
          className={cn("cursor-grab", dragging === v.id && "opacity-40", over?.id === v.id && (over.where === "after" ? "shadow-[inset_-2px_0_0_0_var(--ring)]" : "shadow-[inset_2px_0_0_0_var(--ring)]"))}
          data-drop={over?.id === v.id ? over.where : undefined}
          onDragStart={(e: React.DragEvent) => { dragId.current = v.id; setDragging(v.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", v.id); }}
          onDragEnd={end}
          onDragOver={(e: React.DragEvent<HTMLButtonElement>) => {
            if (!dragId.current) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            const where = e.clientX > r.left + r.width / 2 ? "after" : "before";
            setOver((o) => (o && o.id === v.id && o.where === where ? o : { id: v.id, where }));
          }}
          onDragLeave={() => setOver((o) => (o?.id === v.id ? null : o))}
          onDrop={(e: React.DragEvent) => {
            e.preventDefault();
            const from = dragId.current;
            const at = over;
            end();
            if (from && at) onOrder(moveTo(ids, from, at.id, at.where));
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
            e.preventDefault(); // skips Radix's own arrow handling
            const next = shift(ids, v.id, e.key === "ArrowLeft" ? -1 : 1);
            if (!sameOrder(next, ids)) {
              onOrder(next);
              requestAnimationFrame(() => refs.current.get(v.id)?.focus());
            }
          }}
        >
          {v.label}
        </TabsTrigger>
      ))}
      {!sameOrder(ids, defaultOrder) && (
        <Button variant="ghost" size="sm" className="mb-0.5 ml-auto" onClick={() => onOrder([...defaultOrder])}>Reset tab order</Button>
      )}
    </TabsList>
  );
}
