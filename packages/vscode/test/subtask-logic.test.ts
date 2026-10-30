import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseAll, expandAll, involvedPeople, listSubtasks, pruneExpanded, taskInvolves, toggleExpanded } from "../src/subtask-logic.ts";

const sub = (assignee?: string, section = "Sub-tasks") => ({ section, text: "t", checked: false, line: 1, assignee });
const task = { owner: "ann", subtasks: [sub("bob"), sub(undefined), sub("Cy", "Done when")] };

test("taskInvolves matches owner or any sub-task assignee, case-insensitively", () => {
  assert.equal(taskInvolves(task, "ann"), true);
  assert.equal(taskInvolves(task, "bob"), true);
  assert.equal(taskInvolves(task, "BOB"), true);
  assert.equal(taskInvolves(task, "dan"), false);
  assert.equal(taskInvolves({ subtasks: [] }, "ann"), false);
  assert.equal(taskInvolves(task, ""), true);
});

test("involvedPeople is distinct, owner first, ignores none", () => {
  assert.deepEqual(involvedPeople({ owner: "ann", subtasks: [sub("bob"), sub("ANN"), sub("bob")] }), ["ann", "bob"]);
  assert.deepEqual(involvedPeople({ owner: "none", subtasks: [] }), []);
});

test("listSubtasks keeps board index and only the Sub-tasks section", () => {
  assert.deepEqual(listSubtasks(task).map((x) => x.index), [0, 1]);
});

test("expansion state: toggle, expand all, collapse all, prune", () => {
  let s: string[] = [];
  s = toggleExpanded(s, "a");
  s = toggleExpanded(s, "b");
  assert.deepEqual(s, ["a", "b"]);
  assert.deepEqual(toggleExpanded(s, "a"), ["b"]);
  assert.deepEqual(toggleExpanded(undefined, "x"), ["x"]);
  assert.deepEqual(expandAll(["a", "a", "b"]), ["a", "b"]);
  assert.deepEqual(collapseAll(), []);
  assert.deepEqual(pruneExpanded(["a", "gone"], ["a", "b"]), ["a"]);
  assert.deepEqual(pruneExpanded(undefined, ["a"]), []);
});
