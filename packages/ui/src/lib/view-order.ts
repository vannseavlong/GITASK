/** Pure tab-order logic. The saved order is only a preference: `resolveOrder` always returns every known id once. */

/** Saved order first (unknown and duplicate ids dropped), then any known id the saved list lacks, in default order. */
export function resolveOrder(saved: readonly string[] | undefined, defaults: readonly string[]): string[] {
  const known = new Set(defaults);
  const out: string[] = [];
  for (const id of Array.isArray(saved) ? saved : []) {
    if (typeof id === "string" && known.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of defaults) if (!out.includes(id)) out.push(id);
  return out;
}

/** Move `id` so it sits before (or after) `target`. Returns the same order if either id is missing or they are equal. */
export function moveTo(order: readonly string[], id: string, target: string, where: "before" | "after"): string[] {
  if (id === target || !order.includes(id) || !order.includes(target)) return [...order];
  const rest = order.filter((x) => x !== id);
  const at = rest.indexOf(target) + (where === "after" ? 1 : 0);
  rest.splice(at, 0, id);
  return rest;
}

/** Move `id` one step left (-1) or right (+1); stays put at the ends. */
export function shift(order: readonly string[], id: string, delta: -1 | 1): string[] {
  const i = order.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return [...order];
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export const sameOrder = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** Pixels the pointer must travel before a press on a tab becomes a drag (a smaller move is a plain click). */
export const DRAG_THRESHOLD = 5;
export const pastThreshold = (dx: number, dy: number, limit = DRAG_THRESHOLD): boolean => Math.hypot(dx, dy) >= limit;

export interface TabSlot { id: string; left: number; right: number }

/**
 * Where a drag released at `x` lands. Works on the x axis only, so the gap between tabs, the empty strip and the
 * Reset button all resolve: left of a tab's midpoint is "before" it, right of the last midpoint is "after" the last tab.
 * Slots must be in display order. Returns null when there are no slots.
 */
export function dropTarget(slots: readonly TabSlot[], x: number): { id: string; where: "before" | "after" } | null {
  const last = slots[slots.length - 1];
  if (!last) return null;
  for (const s of slots) if (x < (s.left + s.right) / 2) return { id: s.id, where: "before" };
  return { id: last.id, where: "after" };
}

/** Screen-reader text after a move, e.g. "Board moved to position 2 of 4". */
export const moveMessage = (label: string, order: readonly string[], id: string): string =>
  `${label} moved to position ${order.indexOf(id) + 1} of ${order.length}`;
