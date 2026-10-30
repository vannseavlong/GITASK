import { test } from "node:test";
import assert from "node:assert/strict";
import { computeOverview, type OverviewBoard, type OverviewTask } from "../src/views/overview-logic.ts";

const TODAY = "2026-10-17";
function task(id: string, column: string, extra: Partial<OverviewTask> & { updated?: string } = {}): OverviewTask {
  const { updated, ...rest } = extra;
  return { id, title: id, path: "/t/" + column + "/" + id + ".md", column, fields: updated === undefined ? {} : { "started / updated": updated }, ...rest };
}
const col = (id: string, tasks: OverviewTask[]) => ({ id, label: id.replace(/^\d+-/, ""), tasks });

test("empty board and null board", () => {
  for (const b of [{ columns: [] }, null, undefined]) {
    const o = computeOverview(b as OverviewBoard, { today: TODAY });
    assert.equal(o.total, 0);
    assert.deepEqual([o.byStatus, o.byTier, o.byOwner, o.stale, o.claimed, o.overdue, o.recent], [[], [], [], [], [], [], []]);
  }
});

test("one column: counts, nothing is 'done' so nothing is overdue-exempt", () => {
  const b = { columns: [col("1-backlog", [task("A", "1-backlog", { due: "2026-10-01", tier: "T1", owner: "x" })])] };
  const o = computeOverview(b, { today: TODAY });
  assert.deepEqual(o.byStatus, [{ id: "1-backlog", label: "backlog", count: 1 }]);
  assert.equal(o.overdue.length, 1);
  assert.equal(o.overdue[0].days, 16);
});

test("counts per tier (ordered, none last) and per owner", () => {
  const b = { columns: [col("1-a", [
    task("A", "1-a", { tier: "T2", owner: "bob" }), task("B", "1-a", { tier: "T0", owner: "bob" }),
    task("C", "1-a", { owner: "amy" }), task("D", "1-a", { tier: "T10" }),
  ])] };
  const o = computeOverview(b, { today: TODAY });
  assert.deepEqual(o.byTier.map((t) => t.key), ["T0", "T2", "T10", "none"]);
  assert.deepEqual(o.byOwner, [{ key: "bob", count: 2 }, { key: "amy", count: 1 }, { key: "unassigned", count: 1 }]);
});

test("stale boundary: exactly N days is stale, N-1 is not; done and deploy are exempt", () => {
  const b = { columns: [
    col("2-todo", [task("Edge", "2-todo", { updated: "2026-10-03" }), task("Fresh", "2-todo", { updated: "2026-10-04" }), task("Old", "2-todo", { updated: "none / 2026-01-01" })]),
    col("5-done", [task("Done", "5-done", { updated: "2020-01-01" })]),
    col("6-deploy", [task("Dep", "6-deploy", { updated: "2020-01-01" })]),
  ] };
  const o = computeOverview(b, { today: TODAY, staleDays: 14 });
  assert.deepEqual(o.stale.map((s) => [s.id, s.days]), [["Old", 289], ["Edge", 14]]);
  assert.equal(computeOverview(b, { today: TODAY, staleDays: 15 }).stale.length, 1);
});

test("overdue boundary: due today is not overdue, yesterday is; done columns exempt; future date fine", () => {
  const b = { columns: [
    col("1-a", [task("Today", "1-a", { due: TODAY }), task("Yest", "1-a", { due: "2026-10-16" }), task("Future", "1-a", { due: "2099-01-01" })]),
    col("5-done", [task("Fin", "5-done", { due: "2020-01-01" })]),
  ] };
  const o = computeOverview(b, { today: TODAY });
  assert.deepEqual(o.overdue.map((x) => x.id), ["Yest"]);
});

test("without a done/deploy column the last column counts as finished (when more than one)", () => {
  const b = { columns: [col("1-a", [task("A", "1-a", { due: "2020-01-01" })]), col("2-b", [task("B", "2-b", { due: "2020-01-01" })])] };
  assert.deepEqual(computeOverview(b, { today: TODAY }).overdue.map((x) => x.id), ["A"]);
});

test("bad dates never throw and are ignored", () => {
  const bad = ["", "soon", "2026-13-01", "2026-02-30", "26-1-1", "none / none", "2026-10-17T00:00"];
  const tasks = bad.map((u, i) => task("T" + i, "1-a", { updated: u, due: u }));
  tasks.push({ id: "NoFields", title: "x", path: "/p", column: "1-a" } as OverviewTask);
  const o = computeOverview({ columns: [col("1-a", tasks), col("5-done", [])] }, { today: TODAY });
  assert.equal(o.total, 8);
  assert.deepEqual(o.stale, []);
  assert.deepEqual(o.overdue, []);
  assert.equal(o.recent.length, 1); // only the T17T00:00 one contains a real date
  assert.equal(o.undated, 7);
  assert.doesNotThrow(() => computeOverview({ columns: [col("1-a", [task("A", "1-a")])] }, { today: "garbage" }));
  const g = computeOverview({ columns: [col("1-a", [task("A", "1-a", { updated: "2020-01-01", due: "2020-01-01" })])] }, { today: "garbage" });
  assert.deepEqual([g.stale, g.overdue], [[], []]);
});

test("claimed ignores none and blanks", () => {
  const b = { columns: [col("1-a", [task("A", "1-a", { claimedBy: "agent" }), task("B", "1-a", { claimedBy: "None" }), task("C", "1-a", { claimedBy: "  " }), task("D", "1-a")])] };
  assert.deepEqual(computeOverview(b, { today: TODAY }).claimed.map((c) => [c.id, c.claimedBy]), [["A", "agent"]]);
});

test("recent: newest first, capped at 10, injectable limit", () => {
  const ts = Array.from({ length: 15 }, (_, i) => task("T" + String(i).padStart(2, "0"), "1-a", { updated: "2026-10-" + String(i + 1).padStart(2, "0") }));
  const o = computeOverview({ columns: [col("1-a", ts)] }, { today: TODAY });
  assert.equal(o.recent.length, 10);
  assert.equal(o.recent[0].id, "T14");
  assert.equal(o.recent[9].id, "T05");
  assert.equal(computeOverview({ columns: [col("1-a", ts)] }, { today: TODAY, recentLimit: 3 }).recent.length, 3);
});

test("500 tasks across columns is fast and consistent", () => {
  const cols = ["1-backlog", "2-todo", "3-in-progress", "5-done"].map((c) =>
    col(c, Array.from({ length: 125 }, (_, i) => task(c + i, c, { updated: "2026-0" + (1 + (i % 9)) + "-01", tier: "T" + (i % 4), owner: "o" + (i % 7), due: i % 5 ? undefined : "2026-09-01" }))));
  const t0 = Date.now();
  const o = computeOverview({ columns: cols }, { today: TODAY });
  assert.ok(Date.now() - t0 < 500);
  assert.equal(o.total, 500);
  assert.equal(o.byStatus.reduce((n, s) => n + s.count, 0), 500);
  assert.equal(o.byTier.reduce((n, s) => n + s.count, 0), 500);
  assert.equal(o.byOwner.reduce((n, s) => n + s.count, 0), 500);
  assert.equal(o.recent.length, 10);
});
