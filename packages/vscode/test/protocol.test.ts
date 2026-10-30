import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { validateMessage, taskPathInside, type ValidationContext } from "../src/protocol.ts";

const tasksDir = join("/", "ws", "Tasks");
const ctx: ValidationContext = { tasksDir, columns: ["1-backlog", "2-todo", "3-in-progress"], views: ["board", "list"] };
const ok = join(tasksDir, "2-todo", "Ext-x.md");

test("accepts well-formed messages", () => {
  assert.deepEqual(validateMessage({ type: "ready" }, ctx), { ok: true, message: { type: "ready" } });
  assert.deepEqual(validateMessage({ type: "open", path: ok }, ctx), { ok: true, message: { type: "open", path: ok } });
  assert.deepEqual(validateMessage({ type: "new" }, ctx), { ok: true, message: { type: "new" } });
  assert.deepEqual(validateMessage({ type: "new", column: "1-backlog" }, ctx), { ok: true, message: { type: "new", column: "1-backlog" } });
  assert.deepEqual(validateMessage({ type: "new", column: "1-backlog", id: "Web-login-page" }, ctx), { ok: true, message: { type: "new", column: "1-backlog", id: "Web-login-page" } });
  assert.deepEqual(validateMessage({ type: "move", path: ok, to: "3-in-progress" }, ctx), { ok: true, message: { type: "move", path: ok, to: "3-in-progress" } });
  assert.deepEqual(validateMessage({ type: "toggleSubtask", path: ok, index: 3, line: 7 }, ctx), { ok: true, message: { type: "toggleSubtask", path: ok, index: 3, line: 7 } });
  assert.deepEqual(validateMessage({ type: "view", id: "list" }, ctx), { ok: true, message: { type: "view", id: "list" } });
});

test("drops extra fields", () => {
  const r = validateMessage({ type: "open", path: ok, cmd: "rm -rf /" }, ctx);
  assert.deepEqual(r, { ok: true, message: { type: "open", path: ok } });
});

test("rejects non-objects and unknown types", () => {
  for (const bad of [null, undefined, 5, "open", [], {}, { type: 1 }, { type: "exec" }, { type: "__proto__" }]) {
    assert.equal(validateMessage(bad, ctx).ok, false);
  }
});

test("rejects paths outside the Tasks dir", () => {
  const bad = [
    join("/", "etc", "passwd"),
    join(tasksDir, "..", "secret.md"),
    join(tasksDir, "2-todo", "..", "..", "x.md"),
    join(tasksDir, "2-todo", "..", "..", "..", "etc", "x.md"),
    tasksDir + "-evil/2-todo/x.md",
    "2-todo/Ext-x.md",
    "",
    join(tasksDir, "2-todo", "Ext-x.txt"),
    join(tasksDir, "2-todo", ".md"),
    join(tasksDir, "9-nope", "Ext-x.md"),
    join(tasksDir, "2-todo", "sub", "Ext-x.md"),
    join(tasksDir, "Ext-x.md"),
    ok + "\0.md",
    42,
    { toString: () => ok },
  ];
  for (const path of bad) {
    assert.equal(taskPathInside(path, ctx), undefined, String(path));
    assert.equal(validateMessage({ type: "open", path }, ctx).ok, false);
    assert.equal(validateMessage({ type: "move", path, to: "2-todo" }, ctx).ok, false);
    assert.equal(validateMessage({ type: "toggleSubtask", path, index: 0 }, ctx).ok, false);
  }
});

test("normalises a path that stays inside", () => {
  const sneaky = join(tasksDir, "1-backlog", "..", "2-todo", "Ext-x.md");
  assert.equal(taskPathInside(sneaky, ctx), ok);
});

test("rejects unknown columns", () => {
  assert.equal(validateMessage({ type: "move", path: ok, to: "9-nope" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "move", path: ok, to: "../etc" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "move", path: ok }, ctx).ok, false);
  assert.equal(validateMessage({ type: "new", column: "x" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "new", column: 3 }, ctx).ok, false);
});

test("rejects bad new-task ids", () => {
  for (const id of ["-dash", "  space", "a/b", "a b", "a\nb", "", "a<b", "a;b", 5, null]) {
    assert.equal(validateMessage({ type: "new", column: "1-backlog", id }, ctx).ok, false, String(id));
  }
});

test("rejects bad sub-task indexes and views", () => {
  for (const index of [-1, 1.5, NaN, Infinity, "1", null, undefined, 1e9]) {
    assert.equal(validateMessage({ type: "toggleSubtask", path: ok, index, line: 1 }, ctx).ok, false, String(index));
  }
  for (const line of [0, -1, 1.5, "2", null, undefined]) {
    assert.equal(validateMessage({ type: "toggleSubtask", path: ok, index: 0, line }, ctx).ok, false, String(line));
  }
  assert.equal(validateMessage({ type: "view", id: "nope" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "view" }, ctx).ok, false);
});

test("readTask validates the path like open", () => {
  assert.deepEqual(validateMessage({ type: "readTask", path: ok, x: 1 }, ctx), { ok: true, message: { type: "readTask", path: ok } });
  for (const bad of [undefined, "", "Tasks/2-todo/x.md", join(tasksDir, "..", "secret.md"), join(tasksDir, "9-nope", "x.md"), join(tasksDir, "2-todo", "x.txt"), join(tasksDir, "2-todo", "sub", "x.md"), ok + "\0"]) {
    assert.equal(validateMessage({ type: "readTask", path: bad }, ctx).ok, false);
  }
});

test("setColumnColor: existing column and #rrggbb or null only", () => {
  assert.deepEqual(validateMessage({ type: "setColumnColor", column: "2-todo", color: "#AaBb09" }, ctx), { ok: true, message: { type: "setColumnColor", column: "2-todo", color: "#AaBb09" } });
  assert.deepEqual(validateMessage({ type: "setColumnColor", column: "2-todo", color: null }, ctx), { ok: true, message: { type: "setColumnColor", column: "2-todo", color: null } });
  for (const color of ["red", "#abc", "#12345g", "#1234567", "url(x)", "#fff; x", 5, undefined]) {
    assert.equal(validateMessage({ type: "setColumnColor", column: "2-todo", color }, ctx).ok, false, String(color));
  }
  for (const column of ["9-nope", "../x", 3, undefined]) assert.equal(validateMessage({ type: "setColumnColor", column, color: "#000000" }, ctx).ok, false);
});

test("deleteTask and deleteColumn validate path and column", () => {
  const ok2 = join(tasksDir, "2-todo", "A.md");
  assert.deepEqual(validateMessage({ type: "deleteTask", path: ok2 }, ctx), { ok: true, message: { type: "deleteTask", path: ok2 } });
  assert.equal(validateMessage({ type: "deleteTask", path: "/etc/passwd.md" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "deleteTask", path: join(tasksDir, "2-todo", "..", "..", "x.md") }, ctx).ok, false);
  assert.equal(validateMessage({ type: "deleteTask", path: join(tasksDir, "_inbox", "x.md") }, ctx).ok, false);
  assert.equal(validateMessage({ type: "deleteTask" }, ctx).ok, false);
  assert.deepEqual(validateMessage({ type: "deleteColumn", column: "2-todo" }, ctx), { ok: true, message: { type: "deleteColumn", column: "2-todo" } });
  assert.equal(validateMessage({ type: "deleteColumn", column: "9-nope" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "deleteColumn", column: "../2-todo" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "deleteColumn", column: 5 }, ctx).ok, false);
});

test("addSubtask / setSubtaskAssignee / setSubtaskLane validation", () => {
  const v = (m: unknown) => validateMessage(m, ctx);
  assert.deepEqual(v({ type: "addSubtask", path: ok, text: "  Do it " }), { ok: true, message: { type: "addSubtask", path: ok, text: "Do it" } });
  assert.deepEqual(v({ type: "addSubtask", path: ok, text: "x", assignee: "ann", lane: "ux-ui" }), { ok: true, message: { type: "addSubtask", path: ok, text: "x", assignee: "ann", lane: "ux-ui" } });
  for (const bad of [
    { type: "addSubtask", path: "/etc/passwd.md", text: "x" },
    { type: "addSubtask", path: ok },
    { type: "addSubtask", path: ok, text: "   " },
    { type: "addSubtask", path: ok, text: "a\nb" },
    { type: "addSubtask", path: ok, text: "x".repeat(201) },
    { type: "addSubtask", path: ok, text: "x", assignee: "a b" },
    { type: "addSubtask", path: ok, text: "x", assignee: "@ann" },
    { type: "addSubtask", path: ok, text: "x", assignee: 5 },
    { type: "addSubtask", path: ok, text: "x", lane: "1x" },
    { type: "addSubtask", path: ok, text: "x", lane: "a b" },
  ]) assert.equal(v(bad).ok, false, JSON.stringify(bad));

  assert.deepEqual(v({ type: "setSubtaskAssignee", path: ok, index: 1, line: 9, assignee: "bob" }), { ok: true, message: { type: "setSubtaskAssignee", path: ok, index: 1, line: 9, assignee: "bob" } });
  assert.deepEqual(v({ type: "setSubtaskAssignee", path: ok, index: 0, line: 1, assignee: null }), { ok: true, message: { type: "setSubtaskAssignee", path: ok, index: 0, line: 1, assignee: null } });
  assert.deepEqual(v({ type: "setSubtaskLane", path: ok, index: 1, line: 9, lane: "backend" }), { ok: true, message: { type: "setSubtaskLane", path: ok, index: 1, line: 9, lane: "backend" } });
  assert.deepEqual(v({ type: "setSubtaskLane", path: ok, index: 1, line: 9, lane: null }), { ok: true, message: { type: "setSubtaskLane", path: ok, index: 1, line: 9, lane: null } });
  for (const t of ["setSubtaskAssignee", "setSubtaskLane"]) {
    const key = t === "setSubtaskLane" ? "lane" : "assignee";
    for (const bad of [
      { type: t, path: ok, index: -1, line: 1, [key]: null },
      { type: t, path: ok, index: 1.5, line: 1, [key]: null },
      { type: t, path: ok, index: 0, line: 0, [key]: null },
      { type: t, path: ok, index: 0, line: 1 },
      { type: t, path: ok, index: 0, line: 1, [key]: "bad value!" },
      { type: t, path: "/x/y.md", index: 0, line: 1, [key]: null },
    ]) assert.equal(v(bad).ok, false, JSON.stringify(bad));
  }
});

test("github messages: accepted, extra fields (a token, a plan) dropped", () => {
  assert.deepEqual(validateMessage({ type: "githubPlan" }, ctx), { ok: true, message: { type: "githubPlan" } });
  const planHash = "a".repeat(64);
  assert.deepEqual(validateMessage({ type: "githubSync", confirmRepo: "acme/app", planHash, token: "ghp_x", plan: { repo: "evil/repo" } }, ctx), { ok: true, message: { type: "githubSync", confirmRepo: "acme/app", planHash } });
  for (const bad of [{}, { confirmRepo: "acme/app" }, { planHash }, { confirmRepo: "../x", planHash }, { confirmRepo: "acme/app", planHash: "zz" }, { confirmRepo: 5, planHash }]) {
    assert.equal(validateMessage({ type: "githubSync", ...bad }, ctx).ok, false, JSON.stringify(bad));
  }
});

test("deleteImpact request and the confirmed flag on deletes", () => {
  assert.deepEqual(validateMessage({ type: "deleteImpact", path: ok }, ctx), { ok: true, message: { type: "deleteImpact", path: ok } });
  assert.equal(validateMessage({ type: "deleteImpact", path: "/etc/passwd" }, ctx).ok, false);
  assert.deepEqual(validateMessage({ type: "deleteTask", path: ok }, ctx), { ok: true, message: { type: "deleteTask", path: ok } });
  assert.deepEqual(validateMessage({ type: "deleteTask", path: ok, confirmed: true }, ctx), { ok: true, message: { type: "deleteTask", path: ok, confirmed: true } });
  assert.deepEqual(validateMessage({ type: "deleteColumn", column: "2-todo", confirmed: true }, ctx), { ok: true, message: { type: "deleteColumn", column: "2-todo", confirmed: true } });
  for (const bad of [false, "yes", 1, null]) {
    assert.equal(validateMessage({ type: "deleteTask", path: ok, confirmed: bad }, ctx).ok, false, String(bad));
    assert.equal(validateMessage({ type: "deleteColumn", column: "2-todo", confirmed: bad }, ctx).ok, false, String(bad));
  }
});

test("addSubtask text may not contain checkbox syntax", () => {
  assert.equal(validateMessage({ type: "addSubtask", path: ok, text: "fine [link](x) and a[0]" }, ctx).ok, true);
  for (const text of ["a [ ] b", "x [x] y", "[X]"]) assert.equal(validateMessage({ type: "addSubtask", path: ok, text }, ctx).ok, false, text);
});

test("editTask: strict patch, unknown fields dropped, bad values rejected", () => {
  const good = validateMessage({ type: "editTask", path: ok, patch: { title: " New ", due: "2026-12-01", tier: "T1", owner: "ann-roe", claimedBy: null, evil: 1 }, extra: 1 }, ctx);
  assert.deepEqual(good, { ok: true, message: { type: "editTask", path: ok, patch: { title: "New", due: "2026-12-01", tier: "T1", owner: "ann-roe", claimedBy: null } } });
  const bad: unknown[] = [
    { title: "a\nb" }, { title: "a\r- [ ] x" }, { title: "" }, { title: "x".repeat(201) }, { title: 5 }, { title: "a\u2028b" },
    { due: "2026-02-30" }, { due: "2026-1-1" }, { due: 5 }, { tier: "T4" }, { tier: "t1" }, { owner: "Ann Roe" }, { owner: "a/b" },
    { claimedBy: "x\ny" }, { claimedBy: "" }, { claimedBy: "y".repeat(121) }, {}, { unknown: 1 }, "str", null,
  ];
  for (const patch of bad) assert.equal(validateMessage({ type: "editTask", path: ok, patch }, ctx).ok, false, JSON.stringify(patch));
  assert.equal(validateMessage({ type: "editTask", path: "/etc/passwd", patch: { title: "x" } }, ctx).ok, false);
  assert.equal(validateMessage({ type: "editTask", path: ok }, ctx).ok, false);
});

test("editSubtask and deleteSubtask validate index, line, text, assignee, lane and confirmed", () => {
  const good = validateMessage({ type: "editSubtask", path: ok, index: 1, line: 9, text: " t ", assignee: null, lane: "ux-ui", x: 1 }, ctx);
  assert.deepEqual(good, { ok: true, message: { type: "editSubtask", path: ok, index: 1, line: 9, text: "t", assignee: null, lane: "ux-ui" } });
  const base = { type: "editSubtask", path: ok, index: 0, line: 3 };
  for (const extra of [{ text: "a\nb" }, { text: "a [x] b" }, { text: "" }, { text: "x".repeat(201) }, { assignee: "a b" }, { assignee: 4 }, { lane: "1x" }, { lane: "a\nb" }, { index: -1 }, { line: 0 }, { index: 1.5 }]) {
    assert.equal(validateMessage({ ...base, ...extra }, ctx).ok, false, JSON.stringify(extra));
  }
  assert.deepEqual(validateMessage({ type: "deleteSubtask", path: ok, index: 0, line: 3 }, ctx), { ok: true, message: { type: "deleteSubtask", path: ok, index: 0, line: 3 } });
  assert.deepEqual(validateMessage({ type: "deleteSubtask", path: ok, index: 0, line: 3, confirmed: true }, ctx), { ok: true, message: { type: "deleteSubtask", path: ok, index: 0, line: 3, confirmed: true } });
  for (const bad of [{ confirmed: "yes" }, { confirmed: false }, { line: "3" }, { index: 1e9 }, { path: "/etc/x.md" }]) {
    assert.equal(validateMessage({ type: "deleteSubtask", path: ok, index: 0, line: 3, ...bad }, ctx).ok, false, JSON.stringify(bad));
  }
});

test("editTask rejects checkbox syntax in title and claimed by", () => {
  const ctx = { tasksDir: "/t/Tasks", columns: ["1-backlog"], views: ["board"] };
  const path = "/t/Tasks/1-backlog/A.md";
  for (const patch of [{ title: "- [ ] sneaky" }, { claimedBy: "me - [x] too" }]) {
    const r = validateMessage({ type: "editTask", path, patch }, ctx);
    assert.equal(r.ok, false);
  }
  assert.equal(validateMessage({ type: "editTask", path, patch: { title: "Fix [x] in docs" } }, ctx).ok, true);
});
