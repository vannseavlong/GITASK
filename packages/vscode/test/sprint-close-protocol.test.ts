import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { validateMessage, type ValidationContext } from "../src/protocol.ts";
import { CONFIRM_MESSAGE_TYPES, unconfirmedBulk } from "../../core/src/confirm.ts";
import { VIEW_IDS } from "../src/view-ids.ts";

const tasksDir = join("/", "ws", "Tasks");
const sprints = [{ id: "S1", state: "closed" }, { id: "S2", state: "active" }, { id: "S3", state: "planned" }];
const ctx: ValidationContext = { tasksDir, columns: ["1-backlog", "2-todo", "5-done"], views: [...VIEW_IDS], sprints };
const off: ValidationContext = { ...ctx, sprints: undefined };
const a = join(tasksDir, "2-todo", "Ext-a.md");
const b = join(tasksDir, "1-backlog", "Ext-b.md");
const hash = "a".repeat(64);
const full = { type: "completeSprint", id: "S2", actions: { [a]: "next", [b]: "backlog" }, resetStatus: "2-todo", planHash: hash, confirmed: true };

const ok = (m: unknown, c = ctx) => {
  const r = validateMessage(m, c);
  assert.equal(r.ok, true, `${JSON.stringify(m)}: ${r.ok ? "" : r.reason}`);
  return (r as { message: unknown }).message;
};
const no = (m: unknown, why?: RegExp, c = ctx) => {
  const r = validateMessage(m, c);
  assert.equal(r.ok, false, JSON.stringify(m));
  if (why) assert.match((r as { reason: string }).reason, why);
};

test("sprintClosePlan: id alone, with actions and resetStatus; extra fields dropped; paths normalised", () => {
  assert.deepEqual(ok({ type: "sprintClosePlan", id: "S2", evil: 1 }), { type: "sprintClosePlan", id: "S2" });
  assert.deepEqual(ok({ type: "sprintClosePlan", id: "S2", actions: {}, resetStatus: null }), { type: "sprintClosePlan", id: "S2", actions: {}, resetStatus: null });
  const messy = join(tasksDir, "2-todo", "..", "2-todo", "Ext-a.md");
  assert.deepEqual(ok({ type: "sprintClosePlan", id: "S2", actions: { [messy]: "next" }, resetStatus: "2-todo" }), { type: "sprintClosePlan", id: "S2", actions: { [a]: "next" }, resetStatus: "2-todo" });
});

test("sprintClosePlan: refuses a closed, planned, unknown or malformed sprint, bad actions, bad resetStatus and sprints off", () => {
  no({ type: "sprintClosePlan", id: "S1" }, /closed; only the active/);
  no({ type: "sprintClosePlan", id: "S3" }, /planned; only the active/);
  no({ type: "sprintClosePlan", id: "S9" }, /does not exist/);
  no({ type: "sprintClosePlan", id: "s2; rm" }, /bad sprint id/);
  no({ type: "sprintClosePlan", id: "S2" }, /sprints are off/, off);
  no({ type: "sprintClosePlan", id: "S2", actions: [] }, /object/);
  no({ type: "sprintClosePlan", id: "S2", actions: { [a]: "delete" } }, /backlog or next/);
  no({ type: "sprintClosePlan", id: "S2", resetStatus: "9-nope" }, /existing status/);
  no({ type: "sprintClosePlan", id: "S2", resetStatus: 2 }, /existing status/);
});

test("completeSprint: a full confirmed request passes unchanged", () => {
  assert.deepEqual(ok({ ...full, extra: "x" }), full);
  assert.deepEqual(ok({ ...full, actions: {}, resetStatus: null }), { ...full, actions: {}, resetStatus: null });
});

test("completeSprint: unknown or escaping paths are refused", () => {
  for (const p of [
    "relative/Ext-a.md",
    join(tasksDir, "9-nope", "Ext-a.md"), // not a column
    join(tasksDir, "..", "secret.md"),
    join(tasksDir, "2-todo", "..", "..", "etc", "passwd.md"),
    join(tasksDir, "2-todo", "sub", "Ext-a.md"),
    join(tasksDir, "2-todo", "Ext-a.txt"),
    join(tasksDir, "_sprints", "S2.md"),
  ]) no({ ...full, actions: { [p]: "backlog" } }, /not a task file/);
  const dup = `${join(tasksDir, "2-todo")}/./Ext-a.md`; // join() would normalise it to the same key
  no({ ...full, actions: { [a]: "next", [dup]: "backlog" } }, /duplicate/);
  const many = Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [join(tasksDir, "2-todo", `T-${i}.md`), "backlog"]));
  no({ ...full, actions: many }, /at most/);
});

test("completeSprint: closed or planned sprint, bad hash, bad resetStatus, missing fields and a faked confirmed are refused", () => {
  no({ ...full, id: "S1" }, /closed/);
  no({ ...full, id: "S3" }, /planned/);
  no({ ...full, id: "S7" }, /does not exist/);
  no(full, /sprints are off/, off);
  for (const h of [undefined, "", "A".repeat(64), "a".repeat(63), "a".repeat(65), "g".repeat(64), 12]) no({ ...full, planHash: h }, /planHash/);
  no({ ...full, resetStatus: undefined }, /existing status/);
  no({ ...full, resetStatus: "6-deploy" }, /existing status/);
  no({ ...full, actions: undefined }, /object/);
  for (const c of ["true", 1, "yes", {}, false, null]) no({ ...full, confirmed: c }, /confirmed must be true/);
});

test("completeSprint without confirmed validates but the shared rule refuses it; with confirmed it passes", () => {
  const { confirmed: _, ...bare } = full;
  const m = ok(bare) as Parameters<typeof unconfirmedBulk>[0];
  assert.match(unconfirmedBulk(m)!, /S2 was not completed: completing needs the confirm dialog\. Nothing was changed\./);
  assert.equal(unconfirmedBulk(ok(full) as Parameters<typeof unconfirmedBulk>[0]), undefined);
  assert.equal(unconfirmedBulk({ type: "ready" }), undefined);
});

test("every non-delete protocol message with `confirmed?: true` is in CONFIRM_MESSAGE_TYPES", () => {
  const src = readFileSync(new URL("../../core/src/protocol.ts", import.meta.url), "utf8");
  const types = [...src.matchAll(/\| \{ type: "(\w+)"[^}]*confirmed\?: true[^}]*\}/g)].map((x) => x[1]).filter((t) => !t.startsWith("delete"));
  assert.deepEqual(types.sort(), [...CONFIRM_MESSAGE_TYPES].sort());
});
