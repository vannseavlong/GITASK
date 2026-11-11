import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { validateMessage, type ValidationContext } from "../src/protocol.ts";
import { VIEW_IDS } from "../src/view-ids.ts";

const tasksDir = join("/", "ws", "Tasks");
const sprints = [{ id: "S1", state: "closed" }, { id: "S2", state: "active" }, { id: "S3", state: "planned" }];
const ctx: ValidationContext = { tasksDir, columns: ["1-backlog", "2-todo"], views: [...VIEW_IDS], sprints };
const off: ValidationContext = { ...ctx, sprints: undefined };
const path = join(tasksDir, "2-todo", "Ext-x.md");

const ok = (m: unknown, c = ctx) => {
  const r = validateMessage(m, c);
  assert.equal(r.ok, true, `${JSON.stringify(m)}: ${r.ok ? "" : r.reason}`);
  return (r as { message: unknown }).message;
};
const no = (m: unknown, c = ctx, why?: RegExp) => {
  const r = validateMessage(m, c);
  assert.equal(r.ok, false, JSON.stringify(m));
  if (why) assert.match((r as { reason: string }).reason, why);
};

test("createSprint: clean fields pass, empty is fine (all defaults), extra message fields are dropped", () => {
  assert.deepEqual(ok({ type: "createSprint", sprint: {} }), { type: "createSprint", sprint: {} });
  assert.deepEqual(
    ok({ type: "createSprint", sprint: { name: "  Sprint 4 ", goal: "Ship planning", start: "2026-11-16", end: "2026-11-29", capacity: 30.5 }, evil: 1 }),
    { type: "createSprint", sprint: { name: "Sprint 4", goal: "Ship planning", start: "2026-11-16", end: "2026-11-29", capacity: 30.5 } },
  );
});

test("createSprint: rejects bad text, dates, numbers, unknown keys, null and sprints off", () => {
  const bad: [unknown, RegExp][] = [
    [{ name: "" }, /empty/],
    [{ name: "x".repeat(81) }, /longer than 80/],
    [{ name: "a\nb" }, /control/],
    [{ name: "a\u202eb" }, /control/],
    [{ goal: "y".repeat(201) }, /longer than 200/],
    [{ goal: "fix - [ ] this" }, /checkbox/],
    [{ name: 5 }, /text/],
    [{ start: "2026-02-30" }, /real date/],
    [{ end: "16/11/2026" }, /real date/],
    [{ start: "2026-11-20", end: "2026-11-19" }, /before/],
    [{ capacity: -1 }, /capacity/],
    [{ capacity: 10000.01 }, /capacity/],
    [{ capacity: 1.234 }, /capacity/],
    [{ capacity: Number.NaN }, /capacity/],
    [{ capacity: Infinity }, /capacity/],
    [{ capacity: "30" }, /capacity/],
    [{ state: "active" }, /unknown sprint field/],
    [{ goal: null }, /cannot be removed/],
    [{ ["__proto__"]: 1 }, /unknown/],
  ];
  for (const [sprint, why] of bad) no({ type: "createSprint", sprint }, ctx, why);
  no({ type: "createSprint" }, ctx, /object/);
  no({ type: "createSprint", sprint: [] }, ctx, /object/);
  no({ type: "createSprint", sprint: {} }, off, /sprints are off/);
});

test("updateSprint: id must exist; null removes; name cannot be removed; empty patch refused", () => {
  assert.deepEqual(ok({ type: "updateSprint", id: "S3", patch: { goal: null, capacity: 0, end: "2026-12-01" } }), { type: "updateSprint", id: "S3", patch: { goal: null, capacity: 0, end: "2026-12-01" } });
  ok({ type: "updateSprint", id: "S1", patch: { goal: "notes" } }); // a closed sprint can still be renamed or annotated
  no({ type: "updateSprint", id: "S9", patch: { goal: "x" } }, ctx, /does not exist/);
  no({ type: "updateSprint", id: "s3", patch: { goal: "x" } }, ctx, /bad sprint id/);
  no({ type: "updateSprint", id: "S03", patch: { goal: "x" } }, ctx, /bad sprint id/);
  no({ type: "updateSprint", id: "../S3", patch: { goal: "x" } }, ctx, /bad sprint id/);
  no({ type: "updateSprint", id: "S3", patch: { name: null } }, ctx, /cannot be removed/);
  no({ type: "updateSprint", id: "S3", patch: {} }, ctx, /nothing to change/);
  no({ type: "updateSprint", id: "S3", patch: { state: "closed" } }, ctx, /unknown sprint field/);
  no({ type: "updateSprint", id: "S3", patch: { goal: "x" } }, off, /sprints are off/);
});

test("startSprint: an existing, not closed sprint (the planned/active rule is core's)", () => {
  assert.deepEqual(ok({ type: "startSprint", id: "S3" }), { type: "startSprint", id: "S3" });
  no({ type: "startSprint", id: "S1" }, ctx, /closed/);
  no({ type: "startSprint", id: "S4" }, ctx, /does not exist/);
  no({ type: "startSprint", id: 3 }, ctx, /bad sprint id/);
  no({ type: "startSprint", id: "S3" }, off, /sprints are off/);
});

test("setTaskSprint: task path in the Tasks dir, sprint existing and open, null back to the backlog", () => {
  assert.deepEqual(ok({ type: "setTaskSprint", path, sprint: "S2" }), { type: "setTaskSprint", path, sprint: "S2" });
  assert.deepEqual(ok({ type: "setTaskSprint", path, sprint: null }), { type: "setTaskSprint", path, sprint: null });
  no({ type: "setTaskSprint", path, sprint: "S1" }, ctx, /closed/);
  no({ type: "setTaskSprint", path, sprint: "S7" }, ctx, /does not exist/);
  no({ type: "setTaskSprint", path }, ctx, /bad sprint id/);
  no({ type: "setTaskSprint", path, sprint: null }, off, /sprints are off/);
  for (const p of [join(tasksDir, "..", "x.md"), join(tasksDir, "_sprints", "S2.md"), join(tasksDir, "9-nope", "x.md"), "2-todo/Ext-x.md", join(tasksDir, "2-todo", "x.txt")]) {
    no({ type: "setTaskSprint", path: p, sprint: "S2" }, ctx, /not a task file/);
  }
});

test("setEstimate: finite 0-10000 with at most 2 decimals, or null", () => {
  for (const value of [0, 3, 0.5, 1.25, 10000, null]) assert.deepEqual(ok({ type: "setEstimate", path, value }), { type: "setEstimate", path, value });
  ok({ type: "setEstimate", path, value: 2 }, off); // an estimate is a plain header; core writes it with sprints off too
  for (const value of [-1, 10001, 1.001, Number.NaN, Infinity, -Infinity, "3", true, undefined, 1e-7]) no({ type: "setEstimate", path, value }, ctx, /estimate/);
  no({ type: "setEstimate", path: "/etc/passwd", value: 1 }, ctx, /not a task file/);
});

test("new: optional sprint must exist and be open", () => {
  assert.deepEqual(ok({ type: "new", column: "1-backlog", id: "A-b", title: "T", sprint: "S3" }), { type: "new", column: "1-backlog", id: "A-b", title: "T", sprint: "S3" });
  no({ type: "new", column: "1-backlog", sprint: "S1" }, ctx, /closed/);
  no({ type: "new", column: "1-backlog", sprint: "S8" }, ctx, /does not exist/);
  no({ type: "new", column: "1-backlog", sprint: "S3" }, off, /sprints are off/);
});

test("view id `sprint` is registered in the UI, VIEW_IDS and is a view message", () => {
  assert.ok((VIEW_IDS as readonly string[]).includes("sprint"));
  ok({ type: "view", id: "sprint" });
  const src = readFileSync(new URL("../../ui/src/views/registry.tsx", import.meta.url), "utf8");
  assert.match(src, /id: "sprint", label: "Sprint", component: SprintView, requires: "sprints"/);
});
