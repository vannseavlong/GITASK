import { test } from "node:test";
import assert from "node:assert/strict";
import { statusVisibility, STATUS_VISIBILITY_SRC } from "../src/status-visibility.ts";

const sv = statusVisibility();
const board = {
  columns: [
    { id: "1-backlog", label: "backlog", tasks: [1, 2] },
    { id: "2-todo", label: "todo", tasks: [3] },
    { id: "3-done", label: "done", tasks: [] },
  ],
};

test("empty set leaves the board untouched (same object)", () => {
  assert.equal(sv.apply(board, []), board);
  assert.deepEqual(sv.summary(board, []), { shown: 3, total: 3, hiddenTasks: 0, allHidden: false, filtered: false });
});

test("hidden status disappears; others keep their tasks", () => {
  const b = sv.apply(board, ["2-todo"])!;
  assert.deepEqual(b.columns.map((c) => c.id), ["1-backlog", "3-done"]);
  assert.equal(board.columns.length, 3, "input not mutated");
  assert.deepEqual(sv.summary(board, ["1-backlog"]), { shown: 2, total: 3, hiddenTasks: 2, allHidden: false, filtered: true });
});

test("unknown, duplicate and non-string ids are ignored", () => {
  assert.deepEqual(sv.sanitize(["nope", "2-todo", "2-todo", 5, null], board), ["2-todo"]);
  assert.deepEqual(sv.sanitize("junk", board), []);
  assert.equal(sv.apply(board, ["gone"]), board);
  assert.deepEqual(sv.toggle([], "gone", board), []);
});

test("toggle hides then shows; a deleted status drops out of the set", () => {
  const a = sv.toggle([], "2-todo", board);
  assert.deepEqual(a, ["2-todo"]);
  assert.deepEqual(sv.toggle(a, "2-todo", board), []);
  const smaller = { columns: board.columns.slice(0, 1) };
  assert.deepEqual(sv.sanitize(["2-todo", "1-backlog"], smaller), ["1-backlog"]);
});

test("all hidden is reported, and no cards are lost from the source board", () => {
  const all = board.columns.map((c) => c.id);
  assert.equal(sv.summary(board, all).allHidden, true);
  assert.equal(sv.apply(board, all)!.columns.length, 0);
  assert.equal(sv.summary(null, []).allHidden, false);
  assert.equal(sv.apply(null, ["x"]), null);
});

test("chips carry counts and hidden flag", () => {
  assert.deepEqual(sv.chips(board, ["3-done"]).map((c) => [c.label, c.count, c.hidden]), [["backlog", 2, false], ["todo", 1, false], ["done", 0, true]]);
});

test("shipped source is self-contained", () => {
  const SV = new Function(STATUS_VISIBILITY_SRC + "; return SV;")();
  assert.deepEqual(SV.apply(board, ["1-backlog"]).columns.map((c: { id: string }) => c.id), ["2-todo", "3-done"]);
});

test("a transient board with no columns or no columns field does not lose the stored set", () => {
  const sv = statusVisibility();
  const stored = ["2-todo"];
  assert.equal(sv.apply({ columns: [] }, stored)?.columns.length, 0);
  assert.deepEqual(sv.chips({ columns: [] }, stored), []);
  assert.equal(sv.summary({} as never, stored).total, 0);
  assert.deepEqual(sv.chips(null, stored), []);
  assert.deepEqual(stored, ["2-todo"]);
  // The set still applies when the real board returns.
  assert.deepEqual(sv.chips(board, stored).filter((c) => c.hidden).map((c) => c.id), ["2-todo"]);
});
