import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { DELETE_MESSAGE_TYPES, unconfirmedDelete } from "../../core/src/confirm.ts";
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

test("extension.ts runs the confirm guard before the message switch", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/extension.ts", import.meta.url), "utf8");
  const guard = src.indexOf("unconfirmedDelete(");
  const dispatch = src.indexOf("switch (m.type)");
  assert.ok(guard > 0 && dispatch > 0 && guard < dispatch, "unconfirmedDelete must be called before switch (m.type)");
});

test("every delete message type in the protocol is covered by the shared rule", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../../core/src/protocol.ts", import.meta.url), "utf8");
  // Find every message type that deletes (type name starts with "delete" and is a WebviewMessage member with `confirmed?`).
  const members = [...src.matchAll(/\| \{ type: "(delete\w+)"[^}]*\}/g)].map((x) => ({ type: x[1], confirmable: x[0].includes("confirmed?: true") }));
  const confirmable = members.filter((x) => x.confirmable).map((x) => x.type).sort();
  assert.deepEqual(confirmable, [...DELETE_MESSAGE_TYPES].sort(), "a delete type in the protocol is missing from DELETE_MESSAGE_TYPES (or the reverse)");
  // Non-confirmable delete-named members must be read-only (deleteImpact), never a silent delete.
  assert.deepEqual(members.filter((x) => !x.confirmable).map((x) => x.type).filter((t) => t !== "deleteImpact"), []);
  const bases: Record<string, object> = { deleteTask: { path }, deleteColumn: { column: "1-backlog" }, deleteSubtask: { path, index: 0, line: 3 } };
  for (const type of DELETE_MESSAGE_TYPES) {
    assert.match(checked({ type, ...bases[type] })!, /confirm dialog/, `${type} without confirmed must be refused`);
    assert.equal(checked({ type, ...bases[type], confirmed: true }), undefined, `${type} with confirmed:true must pass`);
  }
});

test("refusal wording is exactly what both hosts have always returned", () => {
  assert.equal(checked({ type: "deleteTask", path }), "Ext-x was not deleted: deleting needs the confirm dialog.");
  assert.equal(checked({ type: "deleteColumn", column: "1-backlog" }), "status 1-backlog was not deleted: deleting needs the confirm dialog.");
  assert.equal(checked({ type: "deleteSubtask", path, index: 0, line: 3 }), "the sub-task was not deleted: deleting needs the confirm dialog.");
});
