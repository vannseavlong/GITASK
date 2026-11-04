import * as React from "react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { dropTarget, moveMessage, moveTo, pastThreshold, sameOrder, shift } from "@/lib/view-order.ts";

export interface TabItem { id: string; label: string }

/**
 * The tab strip. Tabs reorder by pointer drag or by Alt+Left / Alt+Right on a focused tab. The drag is pointer-event
 * based (not native HTML5 drag) so it also works in Firefox, where a <button> cannot be dragged, and so a press
 * that turns into a drag never activates the tab: mousedown is cancelled (Radix would switch view on it) and a press
 * that did not move is activated on release by focusing the tab, which Radix treats as selecting it.
 * `items` is already in the resolved order (every id once); `onOrder` receives the new order.
 */
export function ViewTabs({ items, defaultOrder, onOrder }: { items: readonly TabItem[]; defaultOrder: readonly string[]; onOrder: (order: string[]) => void }) {
  const ids = items.map((i) => i.id);
  const press = React.useRef<{ id: string; x: number; y: number; active: boolean } | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<{ id: string; where: "before" | "after" } | null>(null);
  const [announce, setAnnounce] = React.useState("");
  const refs = React.useRef(new Map<string, HTMLButtonElement>());
  const list = React.useRef<HTMLDivElement>(null);

  const end = () => { press.current = null; setDragging(null); setOver(null); };
  const slots = () => items.flatMap((i) => { const r = refs.current.get(i.id)?.getBoundingClientRect(); return r ? [{ id: i.id, left: r.left, right: r.right }] : []; });
  const commit = (id: string, next: string[]) => {
    onOrder(next);
    setAnnounce(moveMessage(items.find((i) => i.id === id)?.label ?? id, next, id));
  };

  return (
    <>
      <TabsList ref={list} aria-label="Views">
        {items.map((v) => (
          <TabsTrigger
            key={v.id}
            value={v.id}
            ref={(el: HTMLButtonElement | null) => { if (el) refs.current.set(v.id, el); else refs.current.delete(v.id); }}
            title="Drag, or press Alt+Left / Alt+Right, to reorder"
            className={cn("relative cursor-grab select-none", dragging === v.id && "opacity-40")}
            data-drop={over?.id === v.id ? over.where : undefined}
            onMouseDown={(e: React.MouseEvent) => { if (e.button === 0 && !e.ctrlKey) e.preventDefault(); }}
            onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
              if (e.button !== 0 || e.ctrlKey) return;
              press.current = { id: v.id, x: e.clientX, y: e.clientY, active: false };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e: React.PointerEvent) => {
              const p = press.current;
              if (!p || p.id !== v.id) return;
              if (!p.active) {
                if (!pastThreshold(e.clientX - p.x, e.clientY - p.y)) return;
                p.active = true;
                setDragging(v.id);
              }
              setOver(dropTarget(slots(), e.clientX));
            }}
            onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => {
              const p = press.current;
              if (!p || p.id !== v.id) return;
              const wasDrag = p.active;
              const target = wasDrag ? dropTarget(slots(), e.clientX) : null;
              end();
              if (!wasDrag) { e.currentTarget.focus(); return; } // a plain press: focus selects the tab
              if (target) {
                const next = moveTo(ids, v.id, target.id, target.where);
                if (!sameOrder(next, ids)) commit(v.id, next);
              }
            }}
            onPointerCancel={end}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Escape" && press.current?.active) { end(); return; }
              if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
              e.preventDefault(); // skips Radix's own arrow handling
              const next = shift(ids, v.id, e.key === "ArrowLeft" ? -1 : 1);
              if (!sameOrder(next, ids)) {
                commit(v.id, next);
                requestAnimationFrame(() => refs.current.get(v.id)?.focus());
              }
            }}
          >
            {v.label}
            {over?.id === v.id && <span aria-hidden className={cn("pointer-events-none absolute inset-y-0.5 w-0.5 bg-foreground [forced-color-adjust:none]", over.where === "after" ? "right-0" : "left-0")} />}
          </TabsTrigger>
        ))}
        {!sameOrder(ids, defaultOrder) && (
          <Button
            variant="ghost" size="sm" className="mb-0.5 ml-auto"
            onClick={() => {
              onOrder([...defaultOrder]);
              setAnnounce("Tab order reset");
              // the button unmounts once the order is the default: hand focus to the active tab so it is not lost
              requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')?.focus());
            }}
          >Reset tab order</Button>
        )}
      </TabsList>
      <div role="status" aria-live="polite" className="sr-only">{announce}</div>
    </>
  );
}
