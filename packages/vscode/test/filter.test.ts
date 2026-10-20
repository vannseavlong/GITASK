import { test } from "node:test";
import assert from "node:assert/strict";
import { filterLogic, FILTER_SRC } from "../src/filter-logic.ts";
import { VIEWS } from "../src/views/registry.ts";
import { webviewHtml } from "../src/html.ts";

const { rangeNorm, rangeActive, inRange, filterBoard, countTasks, taskDate } = filterLogic;

function task(id: string, o: Record<string, unknown> = {}) {
  return { id, title: id, path: "/t/" + id + ".md", column: "x", fields: {}, ...o };
}
const upd = (d: string) => ({ "started / updated": "2026-01-01 / " + d });

test("no range or open both ends: everything passes, including tasks without a date", () => {
  assert.equal(inRange(task("a"), undefined), true);
  assert.equal(inRange(task("a"), { from: "", to: "" }), true);
  assert.equal(inRange(task("a"), { from: "garbage", to: "2026-13-40" }), true);
  assert.equal(rangeActive({ from: "", to: "" }), false);
});

test("open ends: from only and to only", () => {
  const t = task("a", { due: "2026-10-15" });
  assert.equal(inRange(t, { from: "2026-10-15" }), true);
  assert.equal(inRange(t, { from: "2026-10-16" }), false);
  assert.equal(inRange(t, { to: "2026-10-15" }), true);
  assert.equal(inRange(t, { to: "2026-10-14" }), false);
});

test("same-day range is inclusive", () => {
  const r = { from: "2026-10-15", to: "2026-10-15" };
  assert.equal(inRange(task("a", { due: "2026-10-15" }), r), true);
  assert.equal(inRange(task("a", { due: "2026-10-14" }), r), false);
  assert.equal(inRange(task("a", { due: "2026-10-16" }), r), false);
});

test("reversed range matches nothing", () => {
  assert.equal(inRange(task("a", { due: "2026-10-15" }), { from: "2026-10-20", to: "2026-10-10" }), false);
});

test("tasks without a usable date are hidden while a range is active", () => {
  const r = { from: "2026-01-01" };
  assert.equal(inRange(task("a"), r), false);
  assert.equal(inRange(task("a", { due: "2026-02-30" }), r), false);
  assert.equal(inRange(task("a", { due: "soon" }), r), false);
  assert.equal(inRange(task("a", { fields: { "started / updated": "garbage" } }), { from: "2026-01-01", field: "updated" }), false);
});

test("field picks due or updated; unknown field means due", () => {
  const t = task("a", { due: "2026-12-01", fields: upd("2026-10-09") });
  assert.equal(taskDate(t, "due"), "2026-12-01");
  assert.equal(taskDate(t, "updated"), "2026-10-09");
  assert.equal(inRange(t, { from: "2026-10-01", to: "2026-10-31", field: "updated" }), true);
  assert.equal(inRange(t, { from: "2026-10-01", to: "2026-10-31", field: "due" }), false);
  assert.equal(rangeNorm({ field: "bogus" }).field, "due");
});

test("filterBoard keeps columns, filters tasks, does not mutate, and returns the same board when inactive", () => {
  const board = { settings: { staleDays: 3 }, columns: [
    { id: "1", label: "one", tasks: [task("a", { due: "2026-10-01" }), task("b", { due: "2026-11-01" })] },
    { id: "2", label: "two", tasks: [task("c")] },
  ] };
  assert.equal(filterBoard(board, { from: "", to: "" }), board);
  const out = filterBoard(board, { from: "2026-10-15" });
  assert.equal(out.columns.length, 2);
  assert.deepEqual(out.columns.map((c) => c.tasks.map((t) => t.id)), [["b"], []]);
  assert.equal(out.settings.staleDays, 3);
  assert.equal(countTasks(board), 3);
  assert.equal(countTasks(out), 1);
  assert.equal(countTasks(null), 0);
});

test("shell embeds the shared filter once, views stay free of it, range kept per view state", () => {
  const html = webviewHtml(VIEWS, { nonce: "N" });
  assert.equal(html.split("function inRange(").length - 1, 1);
  assert.ok(html.includes("get board() { return filterBoard(board, viewState(id).range); }"));
  assert.ok(html.includes("st.range = rangeNorm("));
  assert.ok(html.includes('inp.type = "date"'));
  for (const v of VIEWS) assert.ok(!(v.js ?? "").includes("function inRange"), v.id);
  assert.ok(!/innerHTML|eval\(|new Function/.test(FILTER_SRC));
});
