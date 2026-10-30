import { test } from "node:test";
import assert from "node:assert/strict";
import { timelineLogic, type TLTask } from "../src/views/timeline-logic.ts";

const L = timelineLogic();
const D = (s: string) => L.parseDate(s)!;
const TODAY = D("2026-10-17");

function task(id: string, o: { col?: string; started?: string; updated?: string; due?: string; deps?: string[] } = {}): TLTask {
  const fields: Record<string, string> = {};
  if (o.started !== undefined || o.updated !== undefined) fields["started / updated"] = (o.started ?? "none") + " / " + (o.updated ?? "none");
  return { id, title: id, path: "/t/2-todo/" + id + ".md", column: o.col ?? "2-todo", fields, due: o.due, dependsOn: o.deps ?? [] };
}

test("parseDate accepts real dates only", () => {
  assert.equal(L.formatDate(D("2026-10-17")), "2026-10-17");
  for (const bad of ["", "none", "2026-02-30", "2026-13-01", "2026-1-1", "26-01-01", "2026/01/01", undefined, null, 5, "2026-10-17T00:00"]) assert.equal(L.parseDate(bad), null, String(bad));
  assert.equal(D("2026-10-18") - D("2026-10-17"), 1);
});

test("leap years and month boundaries", () => {
  assert.notEqual(L.parseDate("2028-02-29"), null);
  assert.equal(L.parseDate("2026-02-29"), null);
  assert.equal(L.parseDate("1900-02-29"), null);
  assert.equal(D("2028-03-01") - D("2028-02-28"), 2);
  assert.equal(D("2027-01-01") - D("2026-12-31"), 1);
  assert.deepEqual(L.shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(L.shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(L.shiftMonth(2026, 5, -17), { year: 2025, month: 0 });
  assert.equal(L.monthLabel(2028, 1), "February 2028");
});

test("todayFrom uses the calendar date, not the instant", () => {
  assert.equal(L.todayFrom(new Date(2026, 9, 17, 23, 59, 59)), TODAY);
  assert.equal(L.todayFrom(new Date(2026, 9, 17, 0, 0, 0)), TODAY);
});

test("monthGrid starts on Monday, has 6 full weeks and marks today", () => {
  // 2026-06-01 is a Monday: no leading days.
  const g = L.monthGrid(2026, 5, D("2026-06-15"));
  assert.equal(g.length, 6);
  assert.ok(g.every((r) => r.length === 7));
  assert.equal(g[0][0].iso, "2026-06-01");
  assert.equal(g[0][0].inMonth, true);
  assert.equal(g.flat().filter((c) => c.isToday).length, 1);
  assert.equal(g.flat().find((c) => c.isToday)!.iso, "2026-06-15");
  // 2026-02-01 is a Sunday: six leading days from January.
  const feb = L.monthGrid(2026, 1, TODAY);
  assert.equal(feb[0][0].iso, "2026-01-26");
  assert.equal(feb[0][0].inMonth, false);
  assert.equal(feb[0][6].iso, "2026-02-01");
  assert.equal(feb.flat().filter((c) => c.inMonth).length, 28);
  // Leap February and a year boundary.
  assert.equal(L.monthGrid(2028, 1, TODAY).flat().filter((c) => c.inMonth).length, 29);
  const dec = L.monthGrid(2026, 11, TODAY).flat();
  assert.ok(dec.some((c) => c.iso === "2027-01-01" && !c.inMonth));
  assert.equal(dec.filter((c) => c.inMonth).length, 31);
});

test("dueByDay and countNoDue ignore missing and bad dates", () => {
  const ts = [task("a", { due: "2026-10-20" }), task("b", { due: "2026-10-20" }), task("c"), task("d", { due: "nonsense" })];
  const by = L.dueByDay(ts);
  assert.equal(by[D("2026-10-20")].length, 2);
  assert.equal(Object.keys(by).length, 1);
  assert.equal(L.countNoDue(ts), 2);
  assert.equal(L.countNoDue([]), 0);
});

test("taskSpan: due, open tasks, done tasks, missing dates", () => {
  const a = L.taskSpan(task("a", { started: "2026-10-01", updated: "2026-10-05", due: "2026-10-20" }), TODAY)!;
  assert.deepEqual([a.start, a.end, a.hasDue, a.openEnded, a.overdue], [D("2026-10-01"), D("2026-10-20"), true, false, false]);
  // open task without Due grows to today
  const b = L.taskSpan(task("b", { started: "2026-10-01", updated: "2026-10-05" }), TODAY)!;
  assert.deepEqual([b.end, b.openEnded, b.overdue], [TODAY, true, false]);
  // done task stops at last updated
  const c = L.taskSpan(task("c", { col: "5-done", started: "2026-10-01", updated: "2026-10-05" }), TODAY)!;
  assert.equal(c.end, D("2026-10-05"));
  assert.equal(c.done, true);
  // done and past due is not overdue
  assert.equal(L.taskSpan(task("c2", { col: "5-done", started: "2026-09-01", due: "2026-09-10" }), TODAY)!.overdue, false);
  // overdue open task
  assert.equal(L.taskSpan(task("d", { started: "2026-09-01", due: "2026-10-01" }), TODAY)!.overdue, true);
  // due today is not overdue
  assert.equal(L.taskSpan(task("e", { started: "2026-10-01", due: "2026-10-17" }), TODAY)!.overdue, false);
  // started "none": falls back to updated, then to due, then nothing
  assert.equal(L.taskSpan(task("f", { started: "none", updated: "2026-10-10" }), TODAY)!.start, D("2026-10-10"));
  assert.equal(L.taskSpan(task("g", { due: "2026-10-30" }), TODAY)!.start, D("2026-10-30"));
  assert.equal(L.taskSpan(task("h"), TODAY), null);
  assert.equal(L.taskSpan(task("i", { started: "garbage / more garbage", due: "x" }), TODAY), null);
  // started in the future, open: a one day bar, never negative
  const fut = L.taskSpan(task("j", { started: "2026-12-01" }), TODAY)!;
  assert.equal(fut.end, fut.start);
  // done with updated before started: one day bar
  const odd = L.taskSpan(task("k", { col: "5-done", started: "2026-10-10", updated: "2026-10-01" }), TODAY)!;
  assert.equal(odd.end, odd.start);
});

test("taskSpan: due before started spans both days and is flagged", () => {
  const s = L.taskSpan(task("a", { started: "2026-10-10", due: "2026-10-05" }), TODAY)!;
  assert.equal(s.start, D("2026-10-05"));
  assert.equal(s.end, D("2026-10-10"));
  assert.equal(s.dueBeforeStart, true);
  assert.ok(s.end >= s.start);
});

test("isDoneColumn", () => {
  for (const c of ["5-done", "6-deploy", "done", "7-Done"]) assert.equal(L.isDoneColumn(c), true, c);
  for (const c of ["1-backlog", "3-in-progress", "4-testing", ""]) assert.equal(L.isDoneColumn(c), false, c);
});

test("layout: empty board", () => {
  const lay = L.layout([], TODAY, "month");
  assert.equal(lay.bars.length, 0);
  assert.equal(lay.edges.length, 0);
  assert.ok(lay.width > 0 && lay.height > 0);
  assert.ok(lay.todayX > 0 && lay.todayX < lay.width);
});

test("layout: sorted by start, geometry in pixels, today inside range", () => {
  const ts = [
    task("late", { started: "2026-10-12", due: "2026-10-14" }),
    task("early", { started: "2026-10-01", due: "2026-10-03" }),
    task("none"),
  ];
  const lay = L.layout(ts, TODAY, "week");
  assert.deepEqual(lay.bars.map((b) => b.id), ["early", "late"]);
  assert.deepEqual(lay.unscheduled.map((t) => t.id), ["none"]);
  const [e, l] = lay.bars;
  assert.equal(e.w, 3 * lay.ppd);
  assert.equal(l.x - e.x, 11 * lay.ppd);
  assert.ok(lay.todayX > l.x + l.w);
  assert.ok(lay.todayX < lay.width);
  assert.ok(e.x >= 0);
  // zoom changes the scale
  assert.ok(L.layout(ts, TODAY, "week").ppd > L.layout(ts, TODAY, "month").ppd);
  assert.ok(L.layout(ts, TODAY, "month").ppd > L.layout(ts, TODAY, "quarter").ppd);
  assert.equal(L.layout(ts, TODAY, "bogus").ppd, L.layout(ts, TODAY, "month").ppd);
  for (const z of L.ZOOMS) assert.ok(L.layout(ts, TODAY, z).ticks.length > 0, z);
});

test("layout: dependency edges go from the dependency's end to the dependent's start", () => {
  const ts = [
    task("a", { started: "2026-10-01", due: "2026-10-05" }),
    task("b", { started: "2026-10-08", due: "2026-10-12", deps: ["a"] }),
  ];
  const lay = L.layout(ts, TODAY, "month");
  assert.equal(lay.edges.length, 1);
  const [a, b] = lay.bars;
  assert.equal(lay.edges[0].from, "a");
  assert.equal(lay.edges[0].to, "b");
  assert.ok(lay.edges[0].d.startsWith("M" + (a.x + a.w) + " "));
  assert.ok(lay.edges[0].d.endsWith("H" + b.x));
  // overlapping dependent still produces a path
  const over = L.layout([task("a", { started: "2026-10-01", due: "2026-10-10" }), task("b", { started: "2026-10-05", due: "2026-10-12", deps: ["a"] })], TODAY, "month");
  assert.equal(over.edges.length, 1);
  assert.ok(over.edges[0].d.length > 10);
});

test("layout: dependency on a task with no dates, unknown id or itself draws nothing", () => {
  const ts = [task("a"), task("b", { started: "2026-10-08", due: "2026-10-12", deps: ["a", "ghost", "b"] })];
  const lay = L.layout(ts, TODAY, "month");
  assert.equal(lay.edges.length, 0);
  assert.equal(lay.bars.length, 1);
});

test("layout: dependency cycles terminate", () => {
  const ts = [
    task("a", { started: "2026-10-01", due: "2026-10-05", deps: ["c"] }),
    task("b", { started: "2026-10-03", due: "2026-10-09", deps: ["a"] }),
    task("c", { started: "2026-10-06", due: "2026-10-12", deps: ["b"] }),
  ];
  const lay = L.layout(ts, TODAY, "month");
  assert.equal(lay.edges.length, 3);
});

test("layout: 500 tasks stays fast and consistent", () => {
  const ts: TLTask[] = [];
  for (let i = 0; i < 500; i++) {
    const day = L.formatDate(D("2026-01-01") + (i % 200));
    ts.push(task("t" + i, { started: day, due: L.formatDate(D(day) + (i % 30)), deps: i > 0 ? ["t" + (i - 1)] : [], col: i % 3 ? "2-todo" : "5-done" }));
  }
  const t0 = Date.now();
  const lay = L.layout(ts, TODAY, "week");
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(lay.bars.length, 500);
  assert.equal(lay.edges.length, 499);
  assert.equal(lay.height, lay.headH + 500 * lay.rowH);
  assert.equal(new Set(lay.bars.map((b) => b.row)).size, 500);
});
