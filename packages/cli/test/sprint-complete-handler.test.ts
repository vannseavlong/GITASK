import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/handler.ts";
import type { HostMessage } from "gitask-core";

type PlanResult = Extract<HostMessage, { type: "sprintClosePlanResult" }>;
type Completed = Extract<HostMessage, { type: "sprintCompleted" }>;

const TASK = (id: string, sprint: string, est: number) =>
  `# Task ${id}\n\n- **ID:** ${id}\n- **Sprint:** ${sprint}\n- **Estimate:** ${est}\n- **Started / updated:** 2026-11-01 / 2026-11-02\n\n## Goal\nx\n`;

/** A repo with an active S1: one done task, one todo, one in progress; a dirty unrelated file. */
function repo(config: object = { sprint: { lengthDays: 14 } }) {
  const root = mkdtempSync(join(tmpdir(), "gitask-close-h-"));
  const tasks = join(root, "Tasks");
  for (const c of ["1-backlog", "2-todo", "3-in-progress", "5-done", "_sprints"]) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(tasks, "1-backlog", ".gitkeep"), "");
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify(config));
  writeFileSync(join(tasks, "_sprints", "S1.md"), "# Sprint 1\n- **ID:** S1\n- **State:** active\n- **Start:** 2026-11-01\n- **End:** 2026-11-14\n\n## Review\n## Retro\n");
  const done = join(tasks, "5-done", "A-done.md");
  const todo = join(tasks, "2-todo", "A-todo.md");
  const wip = join(tasks, "3-in-progress", "A-wip.md");
  writeFileSync(done, TASK("T-0001", "S1", 5));
  writeFileSync(todo, TASK("T-0002", "S1", 2));
  writeFileSync(wip, TASK("T-0003", "S1", 3));
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt"); g("commit", "-q", "-m", "init");
  writeFileSync(join(root, "other.txt"), "dirty");
  return { root, tasks, g, done, todo, wip };
}

const snapshot = (r: ReturnType<typeof repo>) => ({
  head: r.g("rev-parse", "HEAD"),
  status: r.g("status", "--porcelain"),
  files: r.g("ls-files", "-o", "-c", "--exclude-standard", "Tasks"),
  s1: readFileSync(join(r.tasks, "_sprints", "S1.md"), "utf8"),
});

test("serve: plan then complete with one task to the backlog and one to the next sprint, reset to todo; one commit", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const p0 = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  assert.equal(p0.type, "sprintClosePlanResult");
  assert.ok(p0.plan && p0.planHash && /^[0-9a-f]{64}$/.test(p0.planHash));
  assert.deepEqual(p0.plan.done.map((t) => t.label), ["T-0001"]);
  assert.deepEqual(Object.values(p0.plan.actions), ["backlog", "backlog"]); // config default
  assert.equal(p0.plan.resetStatus, "2-todo");
  // The view carries board paths and titles only: no target paths, no file contents.
  const json = JSON.stringify(p0);
  assert.doesNotMatch(json, /toPath|## Goal|Started \/ updated/);
  assert.equal(p0.plan.unfinished.find((u) => u.path === r.wip)?.title, "Task T-0003");

  const actions = { [r.todo]: "backlog" as const, [r.wip]: "next" as const };
  const p1 = (await h.handle({ type: "sprintClosePlan", id: "S1", actions, resetStatus: "2-todo" })).reply as PlanResult;
  assert.notEqual(p1.planHash, p0.planHash); // a changed option gives a new hash
  assert.deepEqual(p1.plan!.blockers, []);
  assert.match(p1.plan!.warnings.join("\n"), /S2 will be created/);
  assert.equal(r.g("status", "--porcelain", "--", "Tasks"), ""); // planning wrote nothing

  const before = r.g("rev-parse", "HEAD");
  const c = await h.handle({ type: "completeSprint", id: "S1", actions, resetStatus: "2-todo", planHash: p1.planHash!, confirmed: true });
  const reply = c.reply as Completed;
  assert.equal(reply.ok, true, reply.error);
  assert.equal(reply.next, "S2");
  assert.deepEqual(reply.summary, { committed: { tasks: 3, points: 10 }, done: { tasks: 1, points: 5 }, toBacklog: ["T-0002"], toNext: ["T-0003"] });
  assert.equal(c.changed, true);

  assert.equal(r.g("rev-list", "--count", `${before}..HEAD`), "1");
  assert.equal(r.g("log", "-1", "--format=%s"), "sprint(S1): complete, 1 done, 1 to backlog, 1 to S2");
  const back = join(r.tasks, "1-backlog", "A-todo.md");
  const carried = join(r.tasks, "2-todo", "A-wip.md");
  assert.ok(existsSync(back) && !existsSync(r.todo));
  assert.ok(existsSync(carried) && !existsSync(r.wip));
  assert.doesNotMatch(readFileSync(back, "utf8"), /Sprint:/);
  assert.match(readFileSync(carried, "utf8"), /- \*\*Sprint:\*\* S2\n/);
  assert.match(readFileSync(r.done, "utf8"), /- \*\*Sprint:\*\* S1\n/); // done task untouched
  const s1 = readFileSync(join(r.tasks, "_sprints", "S1.md"), "utf8");
  assert.match(s1, /State:\*\* closed/);
  assert.match(s1, /## Summary\n- Closed: \d{4}-\d\d-\d\d\n- Committed: 3 tasks · 10 pts · Done: 1 · 5 pts\n- To backlog: T-0002 · To S2: T-0003/);
  assert.match(readFileSync(join(r.tasks, "_sprints", "S2.md"), "utf8"), /State:\*\* planned/);
  assert.equal(r.g("status", "--porcelain", "--", "Tasks"), ""); // everything committed
  assert.equal(r.g("status", "--porcelain", "--", "other.txt"), "M other.txt"); // unrelated dirty file left out

  const b = await h.board();
  assert.equal(b.sprints?.active, undefined);
  assert.equal(b.columns.find((x) => x.id === "1-backlog")!.tasks[0].sprint, undefined);
  assert.equal(b.columns.find((x) => x.id === "2-todo")!.tasks[0].sprint, "S2");
});

test("serve: a stale hash changes nothing and says so; re-planning gives a hash that works", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const p = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  // The board changes after the plan: the todo task is moved to done by someone else.
  r.g("mv", r.todo, join(r.tasks, "5-done", "A-todo.md")); r.g("commit", "-q", "-m", "done");
  const snap = snapshot(r);
  const c = (await h.handle({ type: "completeSprint", id: "S1", actions: p.plan!.actions, resetStatus: p.plan!.resetStatus, planHash: p.planHash!, confirmed: true })).reply as Completed;
  assert.equal(c.ok, false);
  assert.equal(c.stale, true);
  assert.match(c.error!, /nothing was changed/i);
  assert.deepEqual(snapshot(r), snap);

  const again = (await h.handle({ type: "sprintClosePlan", id: "S1", actions: { [r.wip]: "backlog" }, resetStatus: null })).reply as PlanResult;
  const ok = (await h.handle({ type: "completeSprint", id: "S1", actions: again.plan!.actions, resetStatus: null, planHash: again.planHash!, confirmed: true })).reply as Completed;
  assert.equal(ok.ok, true, ok.error);
  assert.equal(ok.next, undefined); // nothing went to S2, so it was not created
});

test("serve: a hash for different options is stale too (the request is planned again)", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const p = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  const snap = snapshot(r);
  const c = (await h.handle({ type: "completeSprint", id: "S1", actions: { [r.todo]: "next" }, resetStatus: null, planHash: p.planHash!, confirmed: true })).reply as Completed;
  assert.equal(c.stale, true);
  assert.deepEqual(snapshot(r), snap);
});

test("serve: without confirmed nothing changes and the reply says why", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const p = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  const snap = snapshot(r);
  const c = await h.handle({ type: "completeSprint", id: "S1", actions: p.plan!.actions, resetStatus: p.plan!.resetStatus, planHash: p.planHash! });
  assert.equal(c.status, 200);
  assert.deepEqual(c.reply, { type: "sprintCompleted", ok: false, error: "Sprint S1 was not completed: completing needs the confirm dialog. Nothing was changed." });
  assert.deepEqual(snapshot(r), snap);
});

test("serve: unknown paths, symlinks and a closed sprint are refused; nothing changes", async () => {
  const r = repo();
  const h = createHandler({ dir: r.tasks });
  const p = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  const snap = snapshot(r);
  const base = { type: "completeSprint", id: "S1", resetStatus: "2-todo", planHash: p.planHash!, confirmed: true };

  const ghost = join(r.tasks, "2-todo", "A-ghost.md");
  const g = (await h.handle({ ...base, actions: { ...p.plan!.actions, [ghost]: "backlog" } })).reply as Completed;
  assert.equal(g.ok, false);
  assert.match(g.error!, /no longer on the board, so nothing was changed/);
  assert.equal(g.stale, true);

  const outside = await h.handle({ ...base, actions: { [join(r.root, "other.md")]: "backlog" } });
  assert.equal(outside.status, 400);
  assert.match((outside.reply as { message: string }).message, /Rejected: action path is not a task file/);

  // A planned path that is not unfinished (the done task) is a blocker in the plan.
  const pd = (await h.handle({ type: "sprintClosePlan", id: "S1", actions: { [r.done]: "backlog" } })).reply as PlanResult;
  assert.match(pd.plan!.blockers.join("\n"), /Not an unfinished task of S1/);
  const bd = (await h.handle({ ...base, actions: { [r.done]: "backlog" }, planHash: pd.planHash!, resetStatus: pd.plan!.resetStatus })).reply as Completed;
  assert.equal(bd.ok, false);
  assert.match(bd.error!, /was not completed: Not an unfinished task/);
  assert.equal(bd.stale, undefined);

  // A symlinked task file on the board is never moved.
  const link = join(r.tasks, "3-in-progress", "A-link.md");
  symlinkSync(r.wip, link);
  const sl = (await h.handle({ ...base, actions: { [link]: "backlog" } })).reply as Completed;
  assert.equal(sl.ok, false);
  execFileSync("rm", [link]);
  assert.deepEqual(snapshot(r), snap);

  // Complete for real, then the sprint is closed: both messages are refused by validation.
  const p2 = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  assert.equal(((await h.handle({ ...base, actions: p2.plan!.actions, resetStatus: p2.plan!.resetStatus, planHash: p2.planHash! })).reply as Completed).ok, true);
  for (const m of [{ type: "sprintClosePlan", id: "S1" }, { ...base, actions: {} }]) {
    const x = await h.handle(m);
    assert.equal(x.status, 400);
    assert.match((x.reply as { message: string }).message, /S1 is closed/);
  }
});

test("serve: a blocked plan (name clash in the backlog) is shown with its blocker and refused on complete", async () => {
  const r = repo();
  writeFileSync(join(r.tasks, "1-backlog", "A-todo.md"), "# Clash\n");
  r.g("add", "--", "Tasks"); r.g("commit", "-q", "-m", "clash");
  const h = createHandler({ dir: r.tasks });
  const p = (await h.handle({ type: "sprintClosePlan", id: "S1" })).reply as PlanResult;
  assert.match(p.plan!.blockers.join("\n"), /A-todo\.md already exists in Backlog/i);
  const snap = snapshot(r);
  const c = (await h.handle({ type: "completeSprint", id: "S1", actions: p.plan!.actions, resetStatus: p.plan!.resetStatus, planHash: p.planHash!, confirmed: true })).reply as Completed;
  assert.equal(c.ok, false);
  assert.match(c.error!, /already exists.*Nothing was changed/);
  assert.deepEqual(snapshot(r), snap);
});

test("serve: sprint messages are refused when sprints are off", async () => {
  const r = repo({});
  const h = createHandler({ dir: r.tasks });
  const x = await h.handle({ type: "sprintClosePlan", id: "S1" });
  assert.equal(x.status, 400);
  assert.match((x.reply as { message: string }).message, /sprints are off/);
});
