import { test } from "node:test";
import assert from "node:assert/strict";
import { moveTo, resolveOrder, sameOrder, shift } from "../../ui/src/lib/view-order.ts";

const D = ["overview", "board", "list", "timeline"];

test("no saved order gives the default order", () => {
  assert.deepEqual(resolveOrder(undefined, D), D);
  assert.deepEqual(resolveOrder([], D), D);
});
test("a saved order wins; unknown and duplicate ids are dropped; missing ids are appended in default order", () => {
  assert.deepEqual(resolveOrder(["timeline", "gone", "timeline", "board"], D), ["timeline", "board", "overview", "list"]);
  assert.deepEqual(resolveOrder(["list", "board", "overview", "timeline"], D), ["list", "board", "overview", "timeline"]);
});
test("a malformed saved value falls back to the default", () => {
  assert.deepEqual(resolveOrder("board" as unknown as string[], D), D);
  assert.deepEqual(resolveOrder([1, null, {}] as unknown as string[], D), D);
});
test("every id renders exactly once whatever is saved", () => {
  const r = resolveOrder(["x", "list", "list", "y"], D);
  assert.deepEqual([...r].sort(), [...D].sort());
});
test("moveTo before and after", () => {
  assert.deepEqual(moveTo(D, "timeline", "overview", "before"), ["timeline", "overview", "board", "list"]);
  assert.deepEqual(moveTo(D, "overview", "list", "after"), ["board", "list", "overview", "timeline"]);
  assert.deepEqual(moveTo(D, "board", "list", "before"), D);
});
test("moveTo ignores same or unknown ids", () => {
  assert.deepEqual(moveTo(D, "board", "board", "after"), D);
  assert.deepEqual(moveTo(D, "nope", "board", "after"), D);
  assert.deepEqual(moveTo(D, "board", "nope", "after"), D);
});
test("shift moves one step and stops at the ends", () => {
  assert.deepEqual(shift(D, "board", -1), ["board", "overview", "list", "timeline"]);
  assert.deepEqual(shift(D, "board", 1), ["overview", "list", "board", "timeline"]);
  assert.deepEqual(shift(D, "overview", -1), D);
  assert.deepEqual(shift(D, "timeline", 1), D);
  assert.deepEqual(shift(D, "nope", 1), D);
});
test("sameOrder", () => {
  assert.equal(sameOrder(D, [...D]), true);
  assert.equal(sameOrder(D, ["board", ...D.slice(1)]), false);
  assert.equal(sameOrder(D, D.slice(1)), false);
});

import { dropTarget, moveMessage, pastThreshold } from "../../ui/src/lib/view-order.ts";

// The component has no DOM test setup (no jsdom / testing-library in the repo), so drag, keyboard and Reset are
// tested through the pure helpers view-tabs.tsx is built from.
const SLOTS = [{ id: "a", left: 0, right: 100 }, { id: "b", left: 104, right: 200 }, { id: "c", left: 204, right: 300 }];

test("a press only becomes a drag past the threshold", () => {
  assert.equal(pastThreshold(2, 2), false);
  assert.equal(pastThreshold(0, 0), false);
  assert.equal(pastThreshold(5, 0), true);
  assert.equal(pastThreshold(-3, 4), true);
});
test("dropTarget: halves of a tab, the gap, the empty strip and beyond the last tab (Reset button) all land", () => {
  assert.deepEqual(dropTarget(SLOTS, 10), { id: "a", where: "before" });
  assert.deepEqual(dropTarget(SLOTS, 70), { id: "b", where: "before" });
  assert.deepEqual(dropTarget(SLOTS, 102), { id: "b", where: "before" });
  assert.deepEqual(dropTarget(SLOTS, 190), { id: "c", where: "before" });
  assert.deepEqual(dropTarget(SLOTS, 290), { id: "c", where: "after" });
  assert.deepEqual(dropTarget(SLOTS, 900), { id: "c", where: "after" });
  assert.deepEqual(dropTarget(SLOTS, -50), { id: "a", where: "before" });
  assert.equal(dropTarget([], 5), null);
});
test("a drag released on a gap or past the end produces the expected order", () => {
  const order = ["a", "b", "c"];
  const t = dropTarget(SLOTS, 900)!;
  assert.deepEqual(moveTo(order, "a", t.id, t.where), ["b", "c", "a"]);
  const g = dropTarget(SLOTS, 102)!;
  assert.deepEqual(moveTo(order, "c", g.id, g.where), ["a", "c", "b"]);
  const same = dropTarget(SLOTS, 10)!;
  assert.ok(sameOrder(moveTo(order, "a", same.id, same.where), order));
});
test("Alt+Arrow announcement names the tab and its new position", () => {
  const next = shift(D, "board", 1);
  assert.equal(moveMessage("Board", next, "board"), "Board moved to position 3 of 4");
  assert.equal(moveMessage("Board", shift(["overview", "board"], "board", -1), "board"), "Board moved to position 1 of 2");
});
test("keyboard moves stop at the ends; Reset (the default order) hides the button", () => {
  assert.deepEqual(shift(D, "overview", -1), D);
  assert.deepEqual(shift(D, "timeline", 1), D);
  assert.equal(sameOrder(shift(D, "board", -1), D), false);
  assert.equal(sameOrder(resolveOrder(undefined, D), D), true);
});
