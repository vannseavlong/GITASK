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
