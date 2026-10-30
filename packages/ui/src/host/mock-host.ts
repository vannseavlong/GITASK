import type { BoardData, Host, UiState } from "./types.ts";

function task(col: string, id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id, title, path: `/fixture/Tasks/${col}/${id}.md`, column: col, fields: {}, prefix: id.split("-")[0],
    subtasks: [], progress: { done: 0, total: 0 }, dependsOn: [], ...extra,
  };
}

export const FIXTURE: BoardData = {
  dir: "/fixture/Tasks",
  settings: { staleDays: 14 },
  columns: [
    { id: "1-backlog", label: "backlog", tasks: [task("1-backlog", "Ext-dark-mode", "Dark mode polish", { displayId: "T-0004", tier: "T1", owner: "ann", due: "2026-11-20", fields: { "started / updated": "2026-10-01 / 2026-10-12" } })] },
    { id: "2-todo", label: "todo", color: "#3794ff", tasks: [
      task("2-todo", "Core-people", "Contributors from git history", { displayId: "T-0035", tier: "T2", owner: "SNLRLONG", due: "2026-11-05", progress: { done: 1, total: 4 }, fields: { "started / updated": "2026-10-20 / 2026-10-28" } }),
      task("2-todo", "CLI-serve", "Local web server", { displayId: "T-0040", tier: "T3", owner: "bob", claimedBy: "agent-7", due: "2026-12-01" }),
    ] },
    { id: "3-in-progress", label: "in-progress", color: "#cca700", tasks: [
      task("3-in-progress", "Ext-ui-foundation", "React + shadcn shell and Board", { displayId: "T-0037", tier: "T2", owner: "SNLRLONG", due: "2026-11-02", progress: { done: 3, total: 9 }, fields: { "started / updated": "2026-10-30 / 2026-10-30" } }),
    ] },
    { id: "4-testing", label: "testing", tasks: [] },
    { id: "5-done", label: "done", color: "#89d185", tasks: [
      task("5-done", "Ext-tab-icon", "Icon on the editor tab", { displayId: "T-0036", tier: "T1", owner: "ann", progress: { done: 2, total: 2 }, due: "2026-10-25", fields: { "started / updated": "2026-10-22 / 2026-10-25" } }),
    ] },
  ],
} as unknown as BoardData;

/** In-memory host with a fixture board, used by `vite --mode mock` to look at the UI in a plain browser. */
export function createMockHost(): Host {
  const board: BoardData = structuredClone(FIXTURE);
  const subs = new Set<(b: BoardData) => void>();
  const emit = () => { for (const cb of subs) cb(structuredClone(board)); };
  let state: UiState = {};
  return {
    getBoard: () => Promise.resolve(structuredClone(board)),
    send(m) {
      if (m.type === "ready") queueMicrotask(emit);
      if (m.type === "move") {
        const from = board.columns.find((c) => c.tasks.some((t) => t.path === m.path));
        const to = board.columns.find((c) => c.id === m.to);
        const t = from?.tasks.find((x) => x.path === m.path);
        if (from && to && t) { from.tasks = from.tasks.filter((x) => x !== t); t.column = to.id; to.tasks.push(t); emit(); }
      }
      if (m.type === "deleteTask") { for (const c of board.columns) c.tasks = c.tasks.filter((t) => t.path !== m.path); emit(); }
      if (m.type === "deleteColumn") { board.columns = board.columns.filter((c) => c.id !== m.column); emit(); }
      if (m.type === "setColumnColor") { const c = board.columns.find((x) => x.id === m.column); if (c) { c.color = m.color ?? undefined; emit(); } }
    },
    onBoard(cb) { subs.add(cb); return () => void subs.delete(cb); },
    onMessage: () => () => undefined,
    loadState: () => state,
    saveState: (s) => { state = s; },
  };
}
