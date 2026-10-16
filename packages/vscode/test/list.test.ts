import { test } from "node:test";
import assert from "node:assert/strict";
import { logic, LOGIC_SRC } from "../src/views/list-logic.ts";
import list from "../src/views/list.ts";
import { VIEWS } from "../src/views/registry.ts";
import { webviewHtml } from "../src/html.ts";

const { listRows, listSort, listFilter, listOptions, listView } = logic;

function task(id: string, o: Record<string, unknown> = {}) {
  return { id, title: id, path: "/t/x/" + id + ".md", column: "x", fields: {}, prefix: "", subtasks: [], progress: { done: 0, total: 0 }, dependsOn: [], ...o };
}
const board = {
  columns: [
    { id: "1-backlog", label: "backlog", tasks: [
      task("B", { title: "Beta", tier: "T2", owner: "ann", claimedBy: "none", due: "2026-11-02", fields: { "started / updated": "2026-10-01 / 2026-10-09" }, progress: { done: 1, total: 4 } }),
      task("A", { title: "alpha", tier: "T1", owner: "Bob", claimedBy: "agent", fields: { "started / updated": "none / 2026-10-17" }, progress: { done: 2, total: 2 } }),
    ] },
    { id: "2-todo", label: "todo", tasks: [
      task("C", { title: "Gamma", due: "2026-10-30", fields: { "started / updated": "garbage" } }),
      task("D", { title: "Delta", tier: "T2", owner: "ann", due: "2026-02-30", progress: { done: 3, total: 4 } }),
    ] },
  ],
};
const rows = listRows(board);
const ids = (rs: { id: string }[]) => rs.map((r) => r.id).join("");

test("rows: updated is the second date, bad dates and 'none' are empty", () => {
  assert.deepEqual(rows.map((r) => r.updated), ["2026-10-09", "2026-10-17", "", ""]);
  assert.equal(rows[3].due, "");
  assert.equal(rows[0].claimedBy, "");
  assert.equal(rows[0].status, "backlog");
  assert.equal(rows[2].progress, null);
  assert.equal(rows[0].progress, 0.25);
});

test("sort none keeps board order; unknown dir too", () => {
  assert.equal(ids(listSort(rows, "title", "")), "BACD");
  assert.equal(ids(listSort(rows, "title", "bogus")), "BACD");
});

test("sort every column asc and desc, empties last in both", () => {
  const exp: Record<string, [string, string]> = {};
  exp.title = ["ABDC", "CDBA"];
  exp.status = ["BACD", "CDBA"];
  exp.tier = ["ABDC", "BDAC"];
  exp.owner = ["BDAC", "ABDC"];
  exp.claimedBy = ["ABCD", "ABCD"];
  exp.updated = ["BACD", "ABCD"];
  exp.due = ["CBAD", "BCAD"];
  exp.progress = ["BDAC", "ADBC"];
  for (const [key, [asc, desc]] of Object.entries(exp)) {
    assert.equal(ids(listSort(rows, key, "asc")), asc, key + " asc");
    assert.equal(ids(listSort(rows, key, "desc")), desc, key + " desc");
  }
});

test("dates and progress sort as values, not text", () => {
  const r = listRows({ columns: [{ id: "c", label: "c", tasks: [
    task("x", { progress: { done: 10, total: 100 }, due: "2026-12-01" }),
    task("y", { progress: { done: 2, total: 4 }, due: "2026-02-01" }),
    task("z", { progress: { done: 9, total: 10 }, due: "2026-10-01" }),
  ] }] });
  assert.equal(ids(listSort(r, "progress", "asc")), "xyz");
  assert.equal(ids(listSort(r, "due", "asc")), "yzx");
});

test("sort is stable and does not mutate input", () => {
  const before = ids(rows);
  const s = listSort(rows, "tier", "asc");
  assert.equal(ids(rows), before);
  assert.notEqual(s, rows);
  assert.equal(ids(listSort(rows, "status", "desc")), "CDBA");
});

test("filters by status, tier and owner, combined", () => {
  assert.equal(ids(listFilter(rows, { status: "backlog" })), "BA");
  assert.equal(ids(listFilter(rows, { tier: "T2" })), "BD");
  assert.equal(ids(listFilter(rows, { owner: "ann" })), "BD");
  assert.equal(ids(listFilter(rows, { status: "todo", tier: "T2", owner: "ann" })), "D");
  assert.equal(ids(listFilter(rows, { status: "backlog", tier: "T2", owner: "Bob" })), "");
  assert.equal(ids(listFilter(rows, {})), "BACD");
});

test("search matches title, id, owner case-insensitively and combines with filters", () => {
  assert.equal(ids(listFilter(rows, { q: "ALPHA" })), "A");
  assert.equal(ids(listFilter(rows, { q: "bob" })), "A");
  assert.equal(ids(listFilter(rows, { q: "  delta " })), "D");
  assert.equal(ids(listFilter(rows, { q: "ann", status: "todo" })), "D");
  assert.equal(ids(listFilter(rows, { q: "nothing" })), "");
});

test("options are distinct and sorted, empties dropped", () => {
  assert.deepEqual(listOptions(rows, "owner"), ["ann", "Bob"]);
  assert.deepEqual(listOptions(rows, "tier"), ["T1", "T2"]);
  assert.deepEqual(listOptions(rows, "status"), ["backlog", "todo"]);
});

test("listView filters then sorts", () => {
  const v = listView(board, { tier: "T2", sort: "title", dir: "desc" });
  assert.equal(v.all.length, 4);
  assert.equal(ids(v.shown), "DB");
});

test("empty board and no columns", () => {
  for (const b of [{ columns: [] }, { columns: [{ id: "a", label: "a", tasks: [] }] }, null, undefined]) {
    const v = listView(b, { sort: "due", dir: "asc" });
    assert.equal(v.all.length, 0);
    assert.equal(v.shown.length, 0);
  }
});

test("500 rows: sorted, filtered, stable, fast", () => {
  const tasks = Array.from({ length: 500 }, (_, i) => task("T" + String(i).padStart(3, "0"), {
    tier: "T" + (i % 4), owner: i % 7 ? "o" + (i % 7) : undefined, due: i % 3 ? "2026-" + String(1 + (i % 12)).padStart(2, "0") + "-15" : undefined,
    progress: { done: i % 5, total: 4 },
  }));
  const big = { columns: [{ id: "a", label: "a", tasks: tasks.slice(0, 250) }, { id: "b", label: "b", tasks: tasks.slice(250) }] };
  const t0 = Date.now();
  const v = listView(big, { sort: "due", dir: "asc", tier: "T1" });
  assert.ok(Date.now() - t0 < 500);
  assert.equal(v.all.length, 500);
  assert.equal(v.shown.length, 125);
  const dues = v.shown.map((r) => r.due);
  const firstEmpty = dues.indexOf("");
  assert.ok(dues.slice(firstEmpty).every((d) => d === ""));
  for (let i = 1; i < firstEmpty; i++) assert.ok(dues[i - 1] <= dues[i]);
  for (let i = 1; i < v.shown.length; i++) if (v.shown[i - 1].due === v.shown[i].due) assert.ok(v.shown[i - 1].index < v.shown[i].index);
});

test("malformed tasks do not throw", () => {
  const r = listRows({ columns: [{ id: "a", label: "a", tasks: [{ id: "q", path: "/p", fields: { "started / updated": 5 }, progress: undefined }] }] });
  assert.equal(r.length, 1);
  assert.equal(r[0].title, "q");
});

test("shipped view embeds the tested logic verbatim and is safe for the webview", () => {
  assert.ok(list.js!.includes(LOGIC_SRC));
  assert.ok(!/`|\$\{/.test(list.js!), "no backticks or ${ in view js");
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(list.js!));
  assert.ok(list.css!.split("}").filter((b) => b.trim()).every((b) => b.trim().startsWith(".view-list")));
  assert.ok(list.js!.includes("GITASK.openDetail &&"));
  const html = webviewHtml(VIEWS, { nonce: "N" });
  assert.ok(html.includes('id: "list"'));
  const script = html.match(/<script nonce="N">([\s\S]*?)<\/script>/)![1];
  assert.doesNotThrow(() => new Function("acquireVsCodeApi", "document", "window", script));
});
