/** Pure draft handling for the range picker: edits stay in a draft until Apply. */
export interface DayRange { from: string; to: string }

export const EMPTY_RANGE: DayRange = { from: "", to: "" };

export const hasRange = (r: DayRange): boolean => !!(r.from || r.to);

/** Draft opened from the committed value. */
export const openDraft = (committed: DayRange): DayRange => ({ from: committed.from, to: committed.to });

/** Close without Apply (Esc, outside click): the committed range is kept. */
export const discardDraft = (committed: DayRange): DayRange => openDraft(committed);

/** Clear empties the draft only; the filter changes on Apply. */
export const clearDraft = (): DayRange => ({ ...EMPTY_RANGE });

/** Apply commits the draft; a reversed range is put in order. */
export function applyDraft(draft: DayRange): DayRange {
  return draft.from && draft.to && draft.from > draft.to ? { from: draft.to, to: draft.from } : { from: draft.from, to: draft.to };
}

/** `Sep 29, 2026 - Oct 23, 2026` in the given locale; open ends shown as an ellipsis. */
export function formatRange(r: DayRange, locale?: string): string {
  if (!hasRange(r)) return "";
  const f = (v: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }) : "…";
  };
  return `${f(r.from)} - ${f(r.to)}`;
}
