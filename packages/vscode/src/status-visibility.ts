// Pure show/hide logic for statuses (board columns), shared by all four views. No `vscode` import.
// `statusVisibility` is one self-contained function: html.ts embeds its source into the webview
// (like overview-logic.ts), so the tested code is the shipped code.

export interface SVColumn { id: string; label: string; tasks: unknown[] }
export interface SVBoard { columns: SVColumn[] }
export interface SVChip { id: string; label: string; count: number; hidden: boolean }
export interface SVLogic {
  /** Keep only ids that are real columns, without duplicates. Unknown or deleted statuses are dropped. */
  sanitize(hidden: unknown, board: SVBoard | null | undefined): string[];
  /** Add the id when shown, remove it when hidden. Unknown ids are ignored. */
  toggle(hidden: unknown, id: string, board: SVBoard | null | undefined): string[];
  /** The board without hidden columns. Returns the same object when nothing is hidden. */
  apply<B extends SVBoard>(board: B | null | undefined, hidden: unknown): B | null | undefined;
  /** One chip per status, with its task count. */
  chips(board: SVBoard | null | undefined, hidden: unknown): SVChip[];
  /** Summary for the bar: statuses shown, tasks hidden, and whether every status is hidden. */
  summary(board: SVBoard | null | undefined, hidden: unknown): { shown: number; total: number; hiddenTasks: number; allHidden: boolean; filtered: boolean };
}

export function statusVisibility(): SVLogic {
  function cols(board: SVBoard | null | undefined): SVColumn[] {
    return board && Array.isArray(board.columns) ? board.columns : [];
  }
  function sanitize(hidden: unknown, board: SVBoard | null | undefined): string[] {
    const known = cols(board).map((c) => c.id);
    const out: string[] = [];
    if (Array.isArray(hidden)) {
      for (const h of hidden) if (typeof h === "string" && known.indexOf(h) >= 0 && out.indexOf(h) < 0) out.push(h);
    }
    return out;
  }
  function toggle(hidden: unknown, id: string, board: SVBoard | null | undefined): string[] {
    const cur = sanitize(hidden, board);
    if (cols(board).every((c) => c.id !== id)) return cur;
    return cur.indexOf(id) >= 0 ? cur.filter((h) => h !== id) : cur.concat([id]);
  }
  function apply<B extends SVBoard>(board: B | null | undefined, hidden: unknown): B | null | undefined {
    if (!board) return board;
    const h = sanitize(hidden, board);
    if (!h.length) return board;
    return Object.assign({}, board, { columns: board.columns.filter((c) => h.indexOf(c.id) < 0) });
  }
  function chips(board: SVBoard | null | undefined, hidden: unknown): SVChip[] {
    const h = sanitize(hidden, board);
    return cols(board).map((c) => ({ id: c.id, label: c.label, count: c.tasks.length, hidden: h.indexOf(c.id) >= 0 }));
  }
  function summary(board: SVBoard | null | undefined, hidden: unknown) {
    const cs = chips(board, hidden);
    const shown = cs.filter((c) => !c.hidden).length;
    let hiddenTasks = 0;
    for (const c of cs) if (c.hidden) hiddenTasks += c.count;
    return { shown, total: cs.length, hiddenTasks, allHidden: cs.length > 0 && shown === 0, filtered: shown < cs.length };
  }
  return { sanitize, toggle, apply, chips, summary };
}

/** Client-side source: defines `SV` in the webview. */
export const STATUS_VISIBILITY_SRC = "const SV = (" + statusVisibility.toString() + ")();";
