import { test } from "node:test";
import assert from "node:assert/strict";
import { completedPerWeek, tasksPerPerson, heatmap, type ChartTask } from "../src/views/charts-logic.ts";

const T = (extra: Partial<ChartTask> & { updated?: string } = {}): ChartTask => {
  const { updated, ...rest } = extra;
  return { fields: updated ? { "started / updated": `none / ${updated}` } : {}, ...rest };
};
const people = [
  { id: "ann-roe", name: "Ann Roe", github: "annroe" },
  { id: "bob-ng", name: "Bob Ng" },
];

test("completedPerWeek: Monday weeks, fixed today (Fri 2026-10-30), only finished columns", () => {
  const b = { columns: [
    { id: "2-todo", tasks: [T({ updated: "2026-10-29" })] },
    { id: "5-done", tasks: [
      T({ updated: "2026-10-30" }), T({ updated: "2026-10-26" }), // this week (Mon 26th)
      T({ updated: "2026-10-25" }), // Sunday: previous week
      T({ updated: "2026-08-10" }), // Mon of 12th week back? window starts 2026-08-10
      T({ updated: "2026-08-09" }), // just outside
      T({}), T({ updated: "2026-02-30" }), // undated / invalid: skipped
    ] },
  ] };
  const w = completedPerWeek(b, "2026-10-30");
  assert.equal(w.length, 12);
  assert.equal(w[11].start, "2026-10-26");
  assert.equal(w[11].count, 2);
  assert.equal(w[10].start, "2026-10-19");
  assert.equal(w[10].count, 1);
  assert.equal(w[0].start, "2026-08-10");
  assert.equal(w[0].count, 1);
  assert.equal(w.reduce((n, x) => n + x.count, 0), 4);
});

test("completedPerWeek: no named done column uses the last column; bad input is safe", () => {
  const b = { columns: [{ id: "a", tasks: [] }, { id: "b", tasks: [T({ updated: "2026-10-28" })] }] };
  assert.equal(completedPerWeek(b, "2026-10-30").at(-1)?.count, 1);
  assert.deepEqual(completedPerWeek(null, "2026-10-30").map((x) => x.count), Array(12).fill(0));
  assert.deepEqual(completedPerWeek(b, "nope"), []);
});

test("tasksPerPerson: owner plus sub-task assignees, once per task, people resolved", () => {
  const b = { columns: [{ id: "2-todo", tasks: [
    T({ owner: "Ann Roe", subtasks: [{ assignee: "ann-roe" }, { assignee: "bob-ng" }, { assignee: "bob-ng" }, {}] }),
    T({ owner: "annroe" }),
    T({ owner: "Zed" , subtasks: [{ assignee: "zed" }]}),
    T({}),
  ] }] };
  const r = tasksPerPerson(b, people);
  assert.deepEqual(r.map((x) => [x.name, x.count]), [["Ann Roe", 2], ["Bob Ng", 1], ["Zed", 1], ["unassigned", 1]]);
  assert.equal(r[0].github, "annroe");
});

test("tasksPerPerson: folds the tail into Other", () => {
  const tasks = Array.from({ length: 5 }, (_, i) => T({ owner: "P" + i }));
  const r = tasksPerPerson({ columns: [{ id: "x", tasks }] }, [], 3);
  assert.equal(r.length, 3);
  assert.deepEqual([r[2].name, r[2].count], ["Other (3)", 3]);
  assert.deepEqual(tasksPerPerson(null), []);
});

test("heatmap: grid shape, levels, month labels, outside cells", () => {
  const h = heatmap([{ date: "2026-10-30", count: 8 }, { date: "2026-10-29", count: 2 }, { date: "2026-10-28", count: 1 }, { date: "2025-10-30", count: 99 }, { date: "2020-01-01", count: 5 }], "2026-10-30")!;
  assert.equal(h.from, "2025-10-31");
  assert.equal(h.total, 11);
  assert.equal(h.max, 8);
  assert.ok(h.weeks.every((w) => w.length === 7));
  const cells = h.weeks.flat().filter(Boolean);
  assert.equal(cells.length, 365);
  const by = (d: string) => cells.find((c) => c!.date === d)!;
  assert.deepEqual([by("2026-10-30").level, by("2026-10-29").level, by("2026-10-28").level, by("2026-10-27").level], [4, 1, 1, 0]);
  assert.equal(h.weeks.at(-1)![6], null); // Fri today: Saturday is in the future
  assert.equal(h.weeks[0][0], null); // 2025-10-31 is a Friday: Sunday slot is before the range
  assert.equal(h.months[0].label, "Nov");
  assert.equal(h.months.at(-1)!.label, "Oct");
  assert.equal(heatmap([], "bad"), null);
  assert.equal(heatmap(undefined, "2026-10-30")!.max, 0);
});
