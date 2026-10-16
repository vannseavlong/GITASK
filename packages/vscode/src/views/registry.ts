// View registry. Adding a view = one new file under src/views/ exporting a ViewDef
// + one line in VIEWS below. Pure module: no `vscode` import.
import board from "./board.ts";
import list from "./list.ts";

/**
 * A view runs in the webview. `js` is client-side source (a string) that must call
 * `GITASK.register({ id, mount(root, api), render(board, api) })`; see html.ts for the client API.
 * A view without `js` shows a "not available yet" placeholder.
 */
export interface ViewDef {
  /** Unique, lower-case id, e.g. "list". */
  id: string;
  /** Tab label. */
  label: string;
  /** Client-side source registering the view. Omit for a placeholder. */
  js?: string;
  /** CSS for the view; scope every selector under `.view-<id>`. */
  css?: string;
}

/** Placeholder for a view that is not built yet. Replace its line with the real view import. */
export function placeholder(id: string, label: string): ViewDef {
  return { id, label };
}

/** Tab order. Replace a `placeholder(...)` line with `import x from "./x.ts"` when its view lands. */
export const VIEWS: readonly ViewDef[] = [
  board,
  list,
  placeholder("timeline", "Timeline"),
  placeholder("overview", "Overview"),
];

export const DEFAULT_VIEW = "board";

/** Throws on duplicate or malformed ids so a bad registry fails loudly at startup and in tests. */
export function checkViews(views: readonly ViewDef[]): void {
  const seen = new Set<string>();
  for (const v of views) {
    if (!/^[a-z][a-z0-9-]*$/.test(v.id)) throw new Error(`Bad view id: ${v.id}`);
    if (seen.has(v.id)) throw new Error(`Duplicate view id: ${v.id}`);
    seen.add(v.id);
  }
}
