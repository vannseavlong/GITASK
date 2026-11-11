import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateUnit, inScope, resolveScope, scopeBoard, scopeNarrows, sprintLabel, sprintRange, sprintStats, sprintTime, type SprintsLite } from "../src/sprint-scope.ts";

const S6 = { id: "S6", name: "Sprint 6", state: "closed" as const, start: "2026-10-19", end: "2026-11-01" };
const S7 = { id: "S7", name: "Sprint 7", state: "active" as const, start: "2026-11-02", end: "2026-11-15", goal: "Ship it" };
const S8 = { id: "S8", name: "Sprint 8", state: "planned" as const };
const sprints: SprintsLite = { config: { doneColumns: ["5-done", "6-deploy"], estimate: "points" }, list: [S6, S7, S8], active: "S7" };
const noActive: SprintsLite = { ...sprints, list: [S6, S8], active: undefined };

const t = (id: string, sprint?: string, estimate?: number) => ({ id, ...(sprint ? { sprint } : {}), ...(estimate !== undefined ? { estimate } : {}) });
const board = {
  columns: [
    { id: "1-backlog", tasks: [t("a"), t("b", "S8", 2)] },
    { id: "3-in-progress", tasks: [t("c", "S7", 3), t("d", "S7")] },
    { id: "5-done", tasks: [t("e", "S7", 5), t("f", "S6", 1), t("g")] },
  ],
};
const ids = (b: typeof board) => b.columns.flatMap((c) => c.tasks.map((x) => x.id));

test("without sprints the scope is off and the board comes back unchanged", () => {
  const s = resolveScope("S7", undefined);
  assert.deepEqual(s, { kind: "off" });
  assert.equal(scopeNarrows(s), false);
  assert.equal(scopeBoard(board, s, undefined), board);
});

test("default and `active` pick the active sprint, else All", () => {
  for (const saved of [undefined, "active"]) {
    const s = resolveScope(saved, sprints);
    assert.equal(s.kind, "sprint");
    assert.equal(s.kind === "sprint" && s.sprint.id, "S7");
    assert.equal(s.kind === "sprint" && s.value, "active");
    assert.deepEqual(resolveScope(saved, noActive), { kind: "all", value: "all" });
  }
});

test("a chosen sprint id is kept; an unknown or deleted id falls back to All", () => {
  const s = resolveScope("S6", sprints);
  assert.equal(s.kind === "sprint" && s.value, "S6");
  const s7 = resolveScope("S7", sprints);
  assert.equal(s7.kind === "sprint" && s7.value, "active", "the active sprint picked by id shows as Active");
  assert.deepEqual(resolveScope("S99", sprints), { kind: "all", value: "all" });
  assert.deepEqual(resolveScope("S7", noActive), { kind: "all", value: "all" });
  assert.deepEqual(resolveScope("all", sprints), { kind: "all", value: "all" });
  assert.deepEqual(resolveScope("backlog", sprints), { kind: "backlog", value: "backlog" });
});

test("sprint scope keeps only that sprint's tasks, including done ones; closed sprints' done tasks stay out", () => {
  assert.deepEqual(ids(scopeBoard(board, resolveScope(undefined, sprints), sprints)), ["c", "d", "e"]);
  assert.deepEqual(ids(scopeBoard(board, resolveScope("S6", sprints), sprints)), ["f"]);
  assert.deepEqual(ids(scopeBoard(board, resolveScope("S8", sprints), sprints)), ["b"]);
});

test("backlog = no sprint and not in a done column; done columns come from config", () => {
  assert.deepEqual(ids(scopeBoard(board, resolveScope("backlog", sprints), sprints)), ["a"]);
  const custom = { ...sprints, config: { ...sprints.config, doneColumns: ["3-in-progress"] } };
  assert.deepEqual(ids(scopeBoard(board, resolveScope("backlog", custom), custom)), ["a", "g"]);
  assert.equal(inScope(t("x"), "1-backlog", { kind: "backlog", value: "backlog" }, []), true);
  assert.equal(inScope(t("x", "S1"), "1-backlog", { kind: "backlog", value: "backlog" }, []), false);
});

test("All keeps every task and returns the same board", () => {
  const all = resolveScope("all", sprints);
  assert.equal(scopeNarrows(all), false);
  assert.equal(scopeBoard(board, all, sprints), board);
});

test("scope is AND-ed: filtering an already filtered board keeps only tasks passing both", () => {
  const filtered = { columns: board.columns.map((c) => ({ ...c, tasks: c.tasks.filter((x) => x.id !== "d") })) };
  assert.deepEqual(ids(scopeBoard(filtered, resolveScope("active", sprints), sprints)), ["c", "e"]);
});

test("stats count tasks and estimates over the whole board, missing estimates as 0", () => {
  assert.deepEqual(sprintStats(board, "S7", sprints.config.doneColumns), { total: 3, done: 1, points: 8, donePoints: 5 });
  assert.deepEqual(sprintStats(board, "S9", sprints.config.doneColumns), { total: 0, done: 0, points: 0, donePoints: 0 });
  const frac = { columns: [{ id: "5-done", tasks: [t("x", "S1", 0.1), t("y", "S1", 0.2)] }] };
  assert.equal(sprintStats(frac, "S1", ["5-done"]).points, 0.3);
});

test("estimate unit hides points for `none`", () => {
  assert.equal(estimateUnit("points"), "pts");
  assert.equal(estimateUnit("hours"), "h");
  assert.equal(estimateUnit("none"), undefined);
});

test("dates and time left, with overdue as a warning", () => {
  assert.equal(sprintRange(S7, "2026-11-12"), "Nov 2 – Nov 15");
  assert.equal(sprintRange({ start: "2027-01-04", end: "2027-01-17" }, "2026-11-12"), "Jan 4, 2027 – Jan 17, 2027");
  assert.equal(sprintRange({}, "2026-11-12"), "");
  assert.deepEqual(sprintTime(S7, "2026-11-12"), { text: "3 days left", warn: false });
  assert.deepEqual(sprintTime(S7, "2026-11-14"), { text: "1 day left", warn: false });
  assert.deepEqual(sprintTime(S7, "2026-11-15"), { text: "last day", warn: false });
  assert.deepEqual(sprintTime(S7, "2026-11-17"), { text: "ended 2 days ago", warn: true });
  assert.deepEqual(sprintTime(S6, "2026-11-12"), { text: "closed", warn: false });
  assert.deepEqual(sprintTime({ state: "planned", start: "2026-11-16" }, "2026-11-12"), { text: "starts in 4 days", warn: false });
  assert.deepEqual(sprintTime(S8, "2026-11-12"), { text: "not started", warn: false });
});

test("switcher labels mark sprints that are not active", () => {
  assert.equal(sprintLabel(S7), "S7 · Sprint 7");
  assert.equal(sprintLabel(S6), "S6 · Sprint 6 (closed)");
});
