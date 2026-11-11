import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/handler.ts";

const TASK = (n: string) => `# ${n}\n\n- **ID:** T-000${n.length}\n- **Owner:** Sam\n- **Started / updated:** 2026-10-02 / 2026-10-05\n\n## Goal\nx\n`;

function repo(sprints = true) {
  const root = mkdtempSync(join(tmpdir(), "gitask-sprint-h-"));
  const tasks = join(root, "Tasks");
  for (const c of ["1-backlog", "2-todo", "5-done"]) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(tasks, "1-backlog", "A-one.md"), TASK("One"));
  writeFileSync(join(tasks, "2-todo", "A-two.md"), TASK("Two"));
  writeFileSync(join(tasks, "5-done", ".gitkeep"), "");
  if (sprints) writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ sprint: { lengthDays: 14 } }));
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt"); g("commit", "-q", "-m", "init");
  writeFileSync(join(root, "other.txt"), "dirty"); // must never be committed by a sprint write
  return { root, tasks, g, one: join(tasks, "1-backlog", "A-one.md"), two: join(tasks, "2-todo", "A-two.md") };
}

test("serve: create, plan, estimate, edit and start a sprint; each write commits only its file", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const c = await h.handle({ type: "createSprint", sprint: { name: "First", goal: "Ship it", capacity: 8 } });
  assert.deepEqual(c.reply, { type: "sprintSaved", action: "create", ok: true, id: "S1" });
  assert.equal(r.g("log", "-1", "--format=%s"), "sprint(S1): create");
  assert.match(readFileSync(join(r.tasks, "_sprints", "S1.md"), "utf8"), /^# First\n- \*\*ID:\*\* S1\n- \*\*State:\*\* planned\n- \*\*Goal:\*\* Ship it\n- \*\*Capacity:\*\* 8\n/);

  assert.equal((await h.handle({ type: "setTaskSprint", path: r.one, sprint: "S1" })).status, 200);
  assert.match(readFileSync(r.one, "utf8"), /- \*\*Sprint:\*\* S1\n/);
  assert.equal(r.g("log", "-1", "--format=%s"), "task(A-one): sprint S1");
  assert.equal((await h.handle({ type: "setEstimate", path: r.one, value: 5 })).status, 200);
  assert.match(readFileSync(r.one, "utf8"), /- \*\*Estimate:\*\* 5\n/);
  assert.equal((await h.handle({ type: "setEstimate", path: r.two, value: 2.5 })).status, 200);

  const board = await h.board();
  const t = board.columns.flatMap((x) => x.tasks).find((x) => x.path === r.one);
  assert.equal(t?.sprint, "S1");
  assert.equal(t?.estimate, 5);

  const u = await h.handle({ type: "updateSprint", id: "S1", patch: { goal: null, end: "2026-12-31" } });
  assert.deepEqual(u.reply, { type: "sprintSaved", action: "update", ok: true, id: "S1" });
  const s = await h.handle({ type: "startSprint", id: "S1" });
  assert.deepEqual(s.reply, { type: "sprintSaved", action: "start", ok: true, id: "S1" });
  assert.equal((await h.board()).sprints?.active, "S1");

  assert.equal((await h.handle({ type: "setTaskSprint", path: r.one, sprint: null })).status, 200);
  assert.doesNotMatch(readFileSync(r.one, "utf8"), /Sprint:/);
  assert.equal(r.g("status", "--porcelain", "--", "other.txt"), "M other.txt"); // unrelated dirty file stays out
  assert.equal(r.g("status", "--porcelain", "--", "Tasks"), "");
});

test("serve: start is refused while another sprint is active; the reason comes back", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  await h.handle({ type: "createSprint", sprint: {} });
  await h.handle({ type: "createSprint", sprint: {} });
  await h.handle({ type: "startSprint", id: "S1" });
  const head = r.g("rev-parse", "HEAD");
  const s = await h.handle({ type: "startSprint", id: "S2" });
  assert.equal(s.reply?.type, "sprintSaved");
  assert.equal((s.reply as { ok: boolean }).ok, false);
  assert.match((s.reply as { error: string }).error, /S1 is active/);
  assert.equal(r.g("rev-parse", "HEAD"), head);
  assert.match(readFileSync(join(r.tasks, "_sprints", "S2.md"), "utf8"), /State:\*\* planned/);
});

test("serve: new task straight into a sprint", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  await h.handle({ type: "createSprint", sprint: {} });
  const n = await h.handle({ type: "new", column: "2-todo", id: "A-three", title: "Three", sprint: "S1" });
  assert.equal(n.reply?.type, "taskCreated");
  assert.match(readFileSync(join(r.tasks, "2-todo", "A-three.md"), "utf8"), /- \*\*Sprint:\*\* S1\n/);
});

test("serve: rejects unknown or closed sprints, foreign paths, symlinks and sprints off, without writing", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  await h.handle({ type: "createSprint", sprint: {} });
  writeFileSync(join(r.tasks, "_sprints", "S2.md"), "# Old\n- **State:** closed\n");
  const outside = join(r.root, "outside.md");
  writeFileSync(outside, TASK("Out"));
  symlinkSync(outside, join(r.tasks, "1-backlog", "A-link.md"));
  const head = r.g("rev-parse", "HEAD");
  const before = readFileSync(r.one, "utf8");
  const bad: [unknown, RegExp][] = [
    [{ type: "setTaskSprint", path: r.one, sprint: "S9" }, /does not exist/],
    [{ type: "setTaskSprint", path: r.one, sprint: "S2" }, /closed/],
    [{ type: "setTaskSprint", path: outside, sprint: "S1" }, /not a task file/],
    [{ type: "setTaskSprint", path: join(r.tasks, "1-backlog", "A-link.md"), sprint: "S1" }, /not a regular file/],
    [{ type: "setTaskSprint", path: join(r.tasks, "1-backlog", "A-ghost.md"), sprint: "S1" }, /ENOENT|no such file/],
    [{ type: "setEstimate", path: r.one, value: 1e9 }, /estimate/],
    [{ type: "setEstimate", path: r.one, value: "3" }, /estimate/],
    [{ type: "createSprint", sprint: { name: "a\u0000b" } }, /control/],
    [{ type: "updateSprint", id: "S1", patch: { start: "2026-13-01" } }, /real date/],
    [{ type: "startSprint", id: "S2" }, /closed/],
    [{ type: "new", column: "1-backlog", id: "A-x", sprint: "S2" }, /closed/],
  ];
  for (const [m, why] of bad) {
    const res = await h.handle(m);
    assert.equal(res.status, 400, JSON.stringify(m));
    assert.match((res.reply as { message: string }).message, why);
  }
  assert.equal(readFileSync(r.one, "utf8"), before);
  assert.equal(readFileSync(outside, "utf8"), TASK("Out"));
  assert.equal(existsSync(join(r.tasks, "1-backlog", "A-x.md")), false);
  assert.equal(r.g("rev-parse", "HEAD"), head);

  const offRepo = repo(false);
  const off = createHandler({ dir: offRepo.tasks });
  for (const m of [{ type: "createSprint", sprint: {} }, { type: "setTaskSprint", path: offRepo.one, sprint: null }]) {
    const res = await off.handle(m);
    assert.equal(res.status, 400);
    assert.match((res.reply as { message: string }).message, /sprints are off/);
  }
});
