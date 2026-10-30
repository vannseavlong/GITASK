import type { BoardData, Host, UiState } from "./types.ts";

function task(col: string, id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id, title, path: `/fixture/Tasks/${col}/${id}.md`, column: col, fields: {}, prefix: id.split("-")[0],
    subtasks: [], progress: { done: 0, total: 0 }, dependsOn: [], ...extra,
  };
}

export const FIXTURE_PEOPLE = [
  { id: "snlrlong", name: "SNLRLONG", github: "snlrlong", role: "backend" },
  { id: "ann-roe", name: "Ann Roe", github: "annroe", role: "design" },
  { id: "bob-ng", name: "Bob Ng" },
];

export const FIXTURE: BoardData = {
  dir: "/fixture/Tasks",
  people: FIXTURE_PEOPLE,
  github: { repo: "acme/app", project: 3 },
  settings: { staleDays: 14 },
  columns: [
    { id: "1-backlog", label: "backlog", tasks: [task("1-backlog", "Ext-dark-mode", "Dark mode polish", { displayId: "T-0004", tier: "T1", owner: "Ann Roe", due: "2026-11-20", fields: { "started / updated": "2026-10-01 / 2026-10-12" } })] },
    { id: "2-todo", label: "todo", color: "#3794ff", tasks: [
      task("2-todo", "Core-people", "Contributors from git history", { displayId: "T-0035", tier: "T2", owner: "SNLRLONG", due: "2026-11-05", progress: { done: 1, total: 4 }, dependsOn: ["CLI-serve"], subtasks: [
        { section: "Sub-tasks", text: "Read authors from git log", checked: true, line: 9, col: 3, assignee: "ann-roe", lane: "backend" },
        { section: "Sub-tasks", text: "Merge duplicate emails", checked: false, line: 10, col: 3, assignee: "bob-ng", lane: "backend" },
        { section: "Sub-tasks", text: "Contributor list screen", checked: false, line: 11, col: 3, assignee: "SNLRLONG", lane: "frontend" },
        { section: "Sub-tasks", text: "Empty-state design", checked: false, line: 12, col: 3, lane: "uxui" },
      ], fields: { "started / updated": "2026-10-20 / 2026-10-28" } }),
      task("2-todo", "CLI-serve", "Local web server", { displayId: "T-0040", tier: "T3", owner: "Bob Ng", claimedBy: "agent-7", due: "2026-12-01" }),
    ] },
    { id: "3-in-progress", label: "in-progress", color: "#cca700", tasks: [
      task("3-in-progress", "Ext-ui-foundation", "React + shadcn shell and Board", { displayId: "T-0037", tier: "T2", owner: "SNLRLONG", due: "2026-11-02", progress: { done: 1, total: 3 }, subtasks: [
        { section: "Sub-tasks", text: "Shell and tabs", checked: true, line: 8, col: 3, assignee: "ann-roe", lane: "frontend" },
        { section: "Sub-tasks", text: "Board cards", checked: false, line: 9, col: 3, assignee: "SNLRLONG", lane: "frontend" },
        { section: "Sub-tasks", text: "Theme tokens", checked: false, line: 10, col: 3, assignee: "bob-ng", lane: "uxui" },
      ], fields: { "started / updated": "2026-10-30 / 2026-10-30" } }),
    ] },
    { id: "4-testing", label: "testing", tasks: [] },
    { id: "5-done", label: "done", color: "#89d185", tasks: [
      task("5-done", "Ext-tab-icon", "Icon on the editor tab", { displayId: "T-0036", tier: "T1", owner: "Ann Roe", progress: { done: 2, total: 2 }, due: "2026-10-25", fields: { "started / updated": "2026-10-22 / 2026-10-25" } }),
    ] },
  ],
} as unknown as BoardData;

/** In-memory host with a fixture board, used by `vite --mode mock` to look at the UI in a plain browser. */
const BODY = (t: { title: string; subtasks: { text: string; checked: boolean }[] }) =>
  `# ${t.title}\n\n## Goal\nShow **who** works on the repo. See [docs](https://example.com/docs) and [bad](javascript:alert(1)).\n\n<script>alert(1)</script>\n\n## Done when\n${t.subtasks.map((s) => `- [${s.checked ? "x" : " "}] ${s.text}`).join("\n")}\n`;

const REPORT_FIXTURE = (from: string, to: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Report</title><style>body{font:14px sans-serif;margin:16px}th,td{padding:4px 8px;text-align:left}</style></head><body><h1>Done report</h1><p>${from || "start"} to ${to || "end"}</p><table><tr><th>Person</th><th>Tasks</th></tr><tr><td>samlee</td><td>3</td></tr><tr><td>ann</td><td>1</td></tr></table></body></html>`;

export function createMockHost(): Host {
  const board: BoardData = structuredClone(FIXTURE);
  const subs = new Set<(b: BoardData) => void>();
  const msgSubs = new Set<Parameters<Host["onMessage"]>[0]>();
  const find = (path: string) => board.columns.flatMap((c) => c.tasks).find((t) => t.path === path);
  const emit = () => { for (const cb of subs) cb(structuredClone(board)); };
  let state: UiState = {};
  return {
    confirmsDelete: true,
    getBoard: () => Promise.resolve(structuredClone(board)),
    send(m) {
      if (m.type === "ready") queueMicrotask(emit);
      if (m.type === "readTask") {
        const t = find(m.path);
        for (const cb of msgSubs) cb(t ? { type: "taskBody", path: m.path, text: BODY(t) } : { type: "taskBody", path: m.path, error: "not found" });
      }
      if (m.type === "githubPlan") {
        const issues = board.columns.filter((c) => !/done/.test(c.id)).flatMap((c) => c.tasks).map((t, i) => ({ taskId: t.id, title: t.title, action: (i % 2 ? "update" : "create") as "create" | "update", issue: i % 2 ? 40 + i : undefined, state: "open" as const, assignees: t.owner === "Ann Roe" ? ["annroe"] : t.owner === "SNLRLONG" ? ["snlrlong"] : [], subIssues: t.subtasks.slice(0, 2).map((s) => ({ title: s.text, state: s.checked ? "closed" as const : "open" as const, assignees: [] })) }));
        for (const cb of msgSubs) cb({ type: "githubPlanResult", plan: { repo: "acme/app", hash: "0".repeat(64), project: 3, issues, notify: [{ login: "annroe", name: "Ann Roe", tasks: ["Ext-dark-mode"] }, { login: "snlrlong", name: "SNLRLONG", tasks: ["Core-people", "Ext-ui-foundation"] }], warnings: ['Bob Ng has no GitHub name; skipped (set "github" for them in Tasks/gitask.json).'] } });
      }
      if (m.type === "githubSync") for (const cb of msgSubs) cb({ type: "githubSyncResult", ok: true, summary: "Synced 3 task(s) to acme/app (2 new issue(s)).", warnings: [] });
      if (m.type === "previewReport") { const r = m.options; for (const cb of msgSubs) cb({ type: "reportPreview", html: REPORT_FIXTURE(r.from, r.to) }); }
      if (m.type === "exportReport") for (const cb of msgSubs) cb({ type: "reportExported", ok: true, path: `gitask-report-${m.options.from}_${m.options.to}.${m.format}` });
      if (m.type === "toggleSubtask") { const st = find(m.path)?.subtasks[m.index]; if (st) { st.checked = !st.checked; emit(); } }
      if (m.type === "addSubtask") {
        const t = find(m.path);
        if (t) {
          const line = Math.max(7, ...t.subtasks.map((x) => x.line)) + 1;
          t.subtasks.push({ section: "Sub-tasks", text: m.text, checked: false, line, col: 3, assignee: m.assignee, lane: m.lane });
          t.progress = { done: t.subtasks.filter((x) => x.checked).length, total: t.subtasks.length };
          emit();
        }
      }
      if (m.type === "setSubtaskAssignee" || m.type === "setSubtaskLane") {
        const st = find(m.path)?.subtasks[m.index];
        if (st && st.line === m.line) {
          if (m.type === "setSubtaskAssignee") st.assignee = m.assignee ?? undefined;
          else st.lane = m.lane ?? undefined;
          emit();
        }
      }
      if (m.type === "move") {
        const from = board.columns.find((c) => c.tasks.some((t) => t.path === m.path));
        const to = board.columns.find((c) => c.id === m.to);
        const t = from?.tasks.find((x) => x.path === m.path);
        if (from && to && t) { from.tasks = from.tasks.filter((x) => x !== t); t.column = to.id; to.tasks.push(t); emit(); }
      }
      if (m.type === "setOwner") {
        const t = find(m.path), p = board.people?.find((x) => x.id === m.person);
        if (t && (m.person === null || p)) { t.owner = p?.name; emit(); }
      }
      if (m.type === "addPerson") {
        const id = m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (id && board.people && !board.people.some((x) => x.id === id)) board.people.push({ id, name: m.name });
        const t = m.path ? find(m.path) : undefined;
        if (t) t.owner = m.name;
        emit();
      }
      if (m.type === "deleteImpact") for (const cb of msgSubs) cb({ type: "deleteImpact", path: m.path, impact: "recoverable", detail: "The file is removed and the removal is committed, so it can be restored from git history." });
      if (m.type === "deleteTask") { for (const c of board.columns) c.tasks = c.tasks.filter((t) => t.path !== m.path); emit(); }
      if (m.type === "deleteColumn") { board.columns = board.columns.filter((c) => c.id !== m.column); emit(); }
      if (m.type === "setColumnColor") { const c = board.columns.find((x) => x.id === m.column); if (c) { c.color = m.color ?? undefined; emit(); } }
    },
    onBoard(cb) { subs.add(cb); return () => void subs.delete(cb); },
    onMessage(cb) { msgSubs.add(cb); return () => void msgSubs.delete(cb); },
    loadState: () => state,
    saveState: (s) => { state = s; },
  };
}
