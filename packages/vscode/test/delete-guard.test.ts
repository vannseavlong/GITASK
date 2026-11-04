import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { unconfirmedDelete } from "../src/delete-guard.ts";
import { validateMessage, type ValidationContext } from "../src/protocol.ts";
import { createVsCodeHost } from "../../ui/src/host/vscode-host.ts";
import { cancelDelete, confirmDelete, requestDelete } from "../../ui/src/lib/delete-flow.ts";

const tasksDir = join("/", "ws", "Tasks");
const ctx: ValidationContext = { tasksDir, columns: ["1-backlog", "2-todo"], views: ["board"] };
const path = join(tasksDir, "2-todo", "Ext-x.md");

function checked(raw: unknown) {
  const v = validateMessage(raw, ctx);
  assert.ok(v.ok, JSON.stringify(v));
  return unconfirmedDelete(v.message);
}

test("a bare delete (no dialog) is refused for task, status and sub-task", () => {
  assert.match(checked({ type: "deleteTask", path })!, /confirm dialog/);
  assert.match(checked({ type: "deleteColumn", column: "1-backlog" })!, /confirm dialog/);
  assert.match(checked({ type: "deleteSubtask", path, index: 0, line: 3 })!, /confirm dialog/);
});

test("a delete with confirmed:true passes the guard", () => {
  assert.equal(checked({ type: "deleteTask", path, confirmed: true }), undefined);
  assert.equal(checked({ type: "deleteColumn", column: "1-backlog", confirmed: true }), undefined);
  assert.equal(checked({ type: "deleteSubtask", path, index: 0, line: 3, confirmed: true }), undefined);
});

test("confirmed can not be faked with a truthy non-true value; validation rejects it", () => {
  for (const bad of ["true", 1, "yes", {}, [], null, false]) {
    for (const base of [{ type: "deleteTask", path }, { type: "deleteColumn", column: "1-backlog" }, { type: "deleteSubtask", path, index: 0, line: 3 }]) {
      const v = validateMessage({ ...base, confirmed: bad }, ctx);
      assert.equal(v.ok && unconfirmedDelete(v.message) === undefined, false, `${JSON.stringify(bad)} must not confirm ${base.type}`);
    }
  }
});

test("non-delete messages are not affected", () => {
  assert.equal(checked({ type: "move", path, to: "1-backlog" }), undefined);
  assert.equal(checked({ type: "deleteImpact", path }), undefined);
});

test("VS Code host uses the in-app dialog: nothing deletes until the dialog confirms", () => {
  const sent: unknown[] = [];
  (globalThis as { acquireVsCodeApi?: unknown }).acquireVsCodeApi = () => ({ postMessage: (m: unknown) => void sent.push(m), getState: () => undefined, setState: () => {} });
  (globalThis as { window?: unknown }).window = { addEventListener: () => {} };
  try {
    const host = createVsCodeHost();
    assert.equal(host.confirmsDelete, true);
    requestDelete(host, { kind: "subtask", path, index: 0, line: 3, label: "s" });
    assert.deepEqual(sent, [], "opening the dialog sends no delete");
    cancelDelete();
    assert.deepEqual(sent, []);
    requestDelete(host, { kind: "subtask", path, index: 0, line: 3, label: "s" });
    confirmDelete();
    assert.deepEqual(sent, [{ type: "deleteSubtask", path, index: 0, line: 3, confirmed: true }]);
  } finally {
    delete (globalThis as { acquireVsCodeApi?: unknown }).acquireVsCodeApi;
    delete (globalThis as { window?: unknown }).window;
  }
});
