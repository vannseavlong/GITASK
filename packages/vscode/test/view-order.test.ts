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
