import { test } from "node:test";
import assert from "node:assert/strict";
import { capacityOf, draftFields, draftOf, parseEstimateInput, pickPlanSprint, plannable, startBlocker, type PlanSprint } from "../../ui/src/lib/sprint-plan.ts";

const S = (id: string, state: PlanSprint["state"], extra: Partial<PlanSprint> = {}): PlanSprint => ({ id, name: `Sprint ${id.slice(1)}`, state, ...extra });
const list = [S("S1", "closed"), S("S2", "active"), S("S3", "planned"), S("S4", "planned")];

test("pickPlanSprint: scope wins, else active, else newest planned, else none", () => {
  assert.equal(pickPlanSprint(list[2], { list, active: "S2" })?.id, "S3");
  assert.equal(pickPlanSprint(list[0], { list, active: "S2" })?.id, "S1"); // closed in scope: shown read-only
  assert.equal(pickPlanSprint(undefined, { list, active: "S2" })?.id, "S2");
  assert.equal(pickPlanSprint(undefined, { list: list.filter((s) => s.state !== "active") })?.id, "S4");
  assert.equal(pickPlanSprint(undefined, { list: [S("S1", "closed")] }), undefined);
  assert.equal(pickPlanSprint(undefined, { list: [] }), undefined);
  assert.equal(pickPlanSprint(undefined, undefined), undefined);
});

test("plannable: active first, closed left out", () => {
  assert.deepEqual(plannable({ list, active: "S2" }).map((s) => s.id), ["S2", "S3", "S4"]);
  assert.deepEqual(plannable(undefined), []);
});

test("capacityOf: sum vs capacity, over only when strictly above, missing estimates count 0", () => {
  assert.deepEqual(capacityOf([3, undefined, 2.5], 10, "pts"), { points: 5.5, capacity: 10, pct: 55, over: false, text: "5.5 / 10 pts" });
  assert.equal(capacityOf([5, 5], 10, "pts").over, false);
  const over = capacityOf([8, 4.1], 10, "h");
  assert.equal(over.over, true);
  assert.equal(over.pct, 100);
  assert.equal(over.text, "12.1 / 10 h · 2.1 over");
  assert.equal(capacityOf([0.1, 0.2], 1, "pts").points, 0.3); // no float noise
  assert.deepEqual(capacityOf([], 0, "pts"), { points: 0, capacity: 0, pct: 0, over: false, text: "0 / 0 pts" });
  assert.equal(capacityOf([1], 0, "pts").over, true);
  assert.equal(capacityOf([4], undefined, "pts").text, "4 pts · no capacity set");
});

test("parseEstimateInput: empty removes; same number rule as core", () => {
  assert.deepEqual(parseEstimateInput(" "), { ok: true, value: null });
  assert.deepEqual(parseEstimateInput("3"), { ok: true, value: 3 });
  assert.deepEqual(parseEstimateInput("0.25"), { ok: true, value: 0.25 });
  assert.deepEqual(parseEstimateInput("10000"), { ok: true, value: 10000 });
  for (const bad of ["-1", "1.234", "10001", "abc", "1e3", "3 pts", "0x10", "Infinity"]) assert.equal(parseEstimateInput(bad).ok, false, bad);
});

test("draftFields: new sprint sends only filled fields", () => {
  assert.deepEqual(draftFields(draftOf(undefined)), { ok: true, fields: {} });
  assert.deepEqual(draftFields({ name: " Sprint 5 ", goal: "Ship", start: "2026-11-16", end: "", capacity: "20" }), { ok: true, fields: { name: "Sprint 5", goal: "Ship", start: "2026-11-16", capacity: 20 } });
});

test("draftFields: edit sends only changes, cleared fields as null", () => {
  const cur = S("S3", "planned", { goal: "Old", start: "2026-11-16", end: "2026-11-29", capacity: 30 });
  assert.deepEqual(draftFields(draftOf(cur), cur), { ok: true, fields: {} });
  assert.deepEqual(draftFields({ ...draftOf(cur), goal: "", capacity: "", end: "2026-12-01" }, cur), { ok: true, fields: { goal: null, end: "2026-12-01", capacity: null } });
  assert.deepEqual(draftFields({ ...draftOf(cur), name: "Renamed" }, cur), { ok: true, fields: { name: "Renamed" } });
});

test("draftFields: refuses what the host would refuse", () => {
  const cur = S("S3", "planned");
  const bad: [Parameters<typeof draftFields>[0], RegExp][] = [
    [{ ...draftOf(cur), name: "" }, /Name must not be empty/],
    [{ ...draftOf(undefined), name: "x".repeat(81) }, /at most 80/],
    [{ ...draftOf(undefined), goal: "y".repeat(201) }, /at most 200/],
    [{ ...draftOf(undefined), goal: "a\u0007b" }, /control/],
    [{ ...draftOf(undefined), goal: "do - [x] it" }, /checkbox/],
    [{ ...draftOf(undefined), start: "2026-11-20", end: "2026-11-19" }, /before/],
    [{ ...draftOf(undefined), start: "tomorrow" }, /date/],
    [{ ...draftOf(undefined), capacity: "lots" }, /Capacity/],
  ];
  for (const [d, why] of bad) {
    const r = draftFields(d, d === bad[0][0] ? cur : undefined);
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, why);
  }
});

test("startBlocker: only a planned sprint, and only when no other is active", () => {
  assert.equal(startBlocker(list[2], { list, active: "S2" }), "S2 is active. Complete it before starting S3.");
  assert.equal(startBlocker(list[2], { list: list.filter((s) => s.id !== "S2") }), undefined);
  assert.match(startBlocker(list[1], { list, active: "S2" }) ?? "", /already active/);
  assert.match(startBlocker(list[0], { list }) ?? "", /closed/);
});
