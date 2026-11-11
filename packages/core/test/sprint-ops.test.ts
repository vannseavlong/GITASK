import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadBoard, parseTask, createSprint, updateSprint, startSprint, setTaskSprint, setEstimate, planSprintClose, applySprintClose,
  SprintCloseError, removeHeaderField, writeSummarySection, readSprints, type Task,
} from "../src/index.ts";

const COLUMNS = ["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done", "6-deploy"];
const TASK = (id: string, extra = "") =>
  `# ${id}\n\n- **ID:** ${id}\n- **Owner:** Sam\n- **Claimed by:** none\n- **Started / updated:** 2026-11-01 / 2026-11-01\n${extra}\n## Goal\nx\n`;
const SPRINT = (id: string, state: string, extra = "") =>
  `# Sprint ${id.slice(1)}\n- **ID:** ${id}\n- **State:** ${state}\n- **Start:** 2026-11-16\n- **End:** 2026-11-29\n${extra}\n## Review\n\n## Retro\n\n## Summary\n`;

interface Setup {
  config?: unknown;
  sprints?: Record<string, string>;
  tasks?: Record<string, string>; // "2-todo/Core-a" -> extra header lines
  untracked?: Record<string, string>;
}

function workspace(s: Setup = {}) {
  const root = mkdtempSync(join(tmpdir(), "gitask-sprintops-"));
  const tasks = join(root, "Tasks");
  for (const c of COLUMNS) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify(s.config ?? { sprint: {} }));
  if (s.sprints) {
    mkdirSync(join(tasks, "_sprints"));
    for (const [id, text] of Object.entries(s.sprints)) writeFileSync(join(tasks, "_sprints", `${id}.md`), text);
  }
  for (const [p, extra] of Object.entries(s.tasks ?? {})) writeFileSync(join(tasks, `${p}.md`), TASK(p.split("/")[1], extra));
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt");
  g("commit", "-q", "-m", "init");
  for (const [p, extra] of Object.entries(s.untracked ?? {})) writeFileSync(join(tasks, `${p}.md`), TASK(p.split("/")[1], extra));
  writeFileSync(join(root, "other.txt"), "dirty"); // an unrelated dirty file must never be committed
  const read = (p: string) => readFileSync(join(tasks, p), "utf8");
  const task = async (id: string): Promise<Task> => (await loadBoard(tasks)).columns.flatMap((c) => c.tasks).find((t) => t.id === id)!;
  const head = () => g("rev-parse", "HEAD");
  const status = () => g("status", "--porcelain");
  return { root, tasks, g, read, task, head, status };
}

/** Every file under Tasks/ with its content, to prove a refused or rolled-back close changed nothing. */
function snapshot(root: string): string {
  return execFileSync("bash", ["-c", "cd Tasks && find . -type f | sort | xargs -I{} sh -c 'echo \"== {}\"; cat \"{}\"'"], { cwd: root }).toString();
}

// ---------- create / update / start ----------

test("createSprint: next id, default name, dates from lengthDays, committed by pathspec", async () => {
  const w = workspace({ config: { sprint: { lengthDays: 7 } } });
  const a = await createSprint(w.tasks);
  assert.equal(a.sprint.id, "S1");
  assert.equal(a.sprint.name, "Sprint 1");
  assert.equal(a.sprint.state, "planned");
  assert.equal(a.sprint.start, undefined);
  assert.ok(a.committed);
  assert.equal(w.g("log", "-1", "--format=%s"), "sprint(S1): create");
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD"), "Tasks/_sprints/S1.md");
  assert.equal(w.status(), "M other.txt");

  const b = await createSprint(w.tasks, { name: "Ship it", goal: "Plan sprints", start: "2026-11-16", capacity: 30 });
  assert.equal(b.sprint.id, "S2");
  assert.deepEqual([b.sprint.name, b.sprint.goal, b.sprint.start, b.sprint.end, b.sprint.capacity], ["Ship it", "Plan sprints", "2026-11-16", "2026-11-22", 30]);
});

test("createSprint: refused when sprints are off or input is bad, nothing written", async () => {
  const off = workspace({ config: {} });
  await assert.rejects(createSprint(off.tasks), /Sprints are off/);
  const w = workspace();
  for (const bad of [{ name: "" }, { name: "x".repeat(81) }, { name: "a\nb" }, { name: "- [ ] x" }, { goal: "y".repeat(201) }, { start: "2026-02-30" },
    { start: "2026-11-16", end: "2026-11-01" }, { capacity: -1 }, { capacity: 1.234 }, { capacity: 10001 }, { capacity: Number.NaN }]) {
    await assert.rejects(createSprint(w.tasks, bad as never), Error, JSON.stringify(bad));
  }
  assert.equal(existsSync(join(w.tasks, "_sprints", "S1.md")), false);
  assert.equal((await readSprints(w.tasks)).length, 0);
});

test("createSprint: autoCommit off writes the file without a commit", async () => {
  const w = workspace();
  const before = w.head();
  const r = await createSprint(w.tasks, {}, { commit: false });
  assert.equal(r.committed, false);
  assert.equal(w.head(), before);
  assert.ok(existsSync(join(w.tasks, "_sprints", "S1.md")));
});

test("updateSprint: sets, replaces and removes lines; checks dates; commits the file", async () => {
  const w = workspace({ sprints: { S3: SPRINT("S3", "planned") } });
  const r = await updateSprint(w.tasks, "S3", { name: "Sprint three", goal: "Go", capacity: 12.5 });
  assert.equal(r.sprint.name, "Sprint three");
  assert.equal(r.sprint.goal, "Go");
  assert.equal(r.sprint.capacity, 12.5);
  assert.equal(w.g("log", "-1", "--format=%s"), "sprint(S3): edit name, goal, capacity");
  assert.match(w.read("_sprints/S3.md"), /- \*\*End:\*\* 2026-11-29\n- \*\*Goal:\*\* Go\n- \*\*Capacity:\*\* 12\.5\n\n## Review/);
  const r2 = await updateSprint(w.tasks, "S3", { goal: null });
  assert.equal(r2.sprint.goal, undefined);
  assert.doesNotMatch(w.read("_sprints/S3.md"), /Goal/);
  await assert.rejects(updateSprint(w.tasks, "S3", { end: "2026-11-01" }), /End must not be before Start/);
  await assert.rejects(updateSprint(w.tasks, "S3", { state: "active" } as never), /Unknown sprint field/);
  await assert.rejects(updateSprint(w.tasks, "S9", { goal: "x" }), /S9 does not exist/);
  await assert.rejects(updateSprint(w.tasks, "../x", { goal: "x" }), /Not a sprint id/);
  assert.equal((await updateSprint(w.tasks, "S3", { name: "Sprint three" })).changed, false);
});

test("startSprint: only a planned sprint, only one active, fills empty dates", async () => {
  const w = workspace({ sprints: { S1: SPRINT("S1", "closed"), S2: "# Sprint 2\n- **ID:** S2\n- **State:** planned\n\n## Review\n", S3: SPRINT("S3", "planned") } });
  const r = await startSprint(w.tasks, "S2", { today: "2026-11-16" });
  assert.deepEqual([r.sprint.state, r.sprint.start, r.sprint.end], ["active", "2026-11-16", "2026-11-29"]);
  assert.equal(w.g("log", "-1", "--format=%s"), "sprint(S2): start");
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD"), "Tasks/_sprints/S2.md");
  await assert.rejects(startSprint(w.tasks, "S3"), /S2 is active/);
  await assert.rejects(startSprint(w.tasks, "S1"), /closed; only a planned sprint/);
  await assert.rejects(startSprint(w.tasks, "S2"), /active; only a planned sprint/);
});

// ---------- task headers ----------

test("setTaskSprint: inserts after the header block, replaces, removes; refuses closed or missing sprints", async () => {
  const w = workspace({ sprints: { S1: SPRINT("S1", "closed"), S2: SPRINT("S2", "active") }, tasks: { "2-todo/Core-a": "" } });
  const r = await setTaskSprint(await w.task("Core-a"), "S2");
  assert.ok(r.committed);
  assert.match(w.read("2-todo/Core-a.md"), /Started \/ updated:\*\* 2026-11-01 \/ 2026-11-01\n- \*\*Sprint:\*\* S2\n\n## Goal/);
  assert.equal(w.g("log", "-1", "--format=%s"), "task(Core-a): sprint S2");
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD"), "Tasks/2-todo/Core-a.md");
  assert.equal((await w.task("Core-a")).sprint, "S2");
  assert.equal((await setTaskSprint(await w.task("Core-a"), "S2")).changed, false);
  await assert.rejects(setTaskSprint(await w.task("Core-a"), "S1"), /S1 is closed/);
  await assert.rejects(setTaskSprint(await w.task("Core-a"), "S7"), /S7 does not exist/);
  await setTaskSprint(await w.task("Core-a"), null);
  assert.doesNotMatch(w.read("2-todo/Core-a.md"), /Sprint/);
  assert.equal(w.g("log", "-1", "--format=%s"), "task(Core-a): sprint none");
  assert.equal(w.status(), "M other.txt");
});

test("setEstimate: set, replace, remove, validated", async () => {
  const w = workspace({ tasks: { "2-todo/Core-a": "- **Estimate:** 1\n" }, untracked: { "2-todo/Core-u": "" } });
  await setEstimate(await w.task("Core-a"), 3);
  assert.equal((await w.task("Core-a")).estimate, 3);
  assert.equal(w.g("log", "-1", "--format=%s"), "task(Core-a): estimate 3");
  await setEstimate(await w.task("Core-a"), 0.5);
  assert.match(w.read("2-todo/Core-a.md"), /- \*\*Estimate:\*\* 0\.5\n/);
  await setEstimate(await w.task("Core-a"), null);
  assert.doesNotMatch(w.read("2-todo/Core-a.md"), /Estimate/);
  for (const bad of [-1, 1.234, 10001, Number.NaN, Infinity, "3"]) await assert.rejects(setEstimate(await w.task("Core-a"), bad as never), /Estimate must be/);
  // Untracked task: written, never committed.
  const head = w.head();
  const r = await setEstimate(await w.task("Core-u"), 2);
  assert.deepEqual([r.changed, r.committed], [true, false]);
  assert.equal(w.head(), head);
});

test("removeHeaderField keeps other lines and CRLF endings, ignores body lines", () => {
  const text = "# X\r\n- **Sprint:** S1\r\n- **Owner:** A\r\n\r\n## Notes\r\n- **Sprint:** keep\r\n";
  assert.equal(removeHeaderField(text, "Sprint"), "# X\r\n- **Owner:** A\r\n\r\n## Notes\r\n- **Sprint:** keep\r\n");
});

test("writeSummarySection replaces an existing section and keeps later ones", () => {
  assert.equal(writeSummarySection("# S\n\n## Summary\nold\n\n## Retro\nr\n", "## Summary\nnew"), "# S\n\n## Summary\nnew\n\n## Retro\nr\n");
  assert.equal(writeSummarySection("# S\n\n## Review\n\n", "## Summary\nnew"), "# S\n\n## Review\n\n## Summary\nnew\n");
});

// ---------- close ----------

const CLOSE = {
  config: { sprint: { estimate: "points" } },
  sprints: { S7: SPRINT("S7", "active") },
  tasks: {
    "5-done/Core-d1": "- **Sprint:** S7\n- **Estimate:** 5\n",
    "6-deploy/Core-d2": "- **Sprint:** S7\n- **Estimate:** 3\n",
    "3-in-progress/Core-b1": "- **Sprint:** S7\n- **Estimate:** 2\n",
    "2-todo/Core-b2": "- **Sprint:** S7\n",
    "3-in-progress/Core-n1": "- **Sprint:** S7\n- **Estimate:** 1\n- **Worktree:** GITASK-n1\n",
    "2-todo/Core-other": "- **Sprint:** S6\n",
    "1-backlog/Core-free": "",
  },
};

test("planSprintClose: pure plan with done, unfinished, defaults, targets, warnings and a stable hash", async () => {
  const w = workspace(CLOSE);
  const before = snapshot(w.root);
  const board = await loadBoard(w.tasks);
  const n1 = join(w.tasks, "3-in-progress", "Core-n1.md");
  const plan = planSprintClose(board, "S7", { [n1]: "next" });
  assert.equal(snapshot(w.root), before);
  assert.deepEqual(plan.done.map((t) => t.id), ["Core-d1", "Core-d2"]);
  assert.deepEqual(plan.unfinished.map((u) => [u.id, u.action, u.to]), [
    ["Core-b2", "backlog", "1-backlog"], ["Core-b1", "backlog", "1-backlog"], ["Core-n1", "next", "2-todo"],
  ]);
  assert.equal(plan.next, "S8");
  assert.equal(plan.createNext, true);
  assert.equal(plan.resetStatus, "2-todo");
  assert.deepEqual(plan.blockers, []);
  assert.ok(plan.warnings.some((x) => /Core-n1 is claimed/.test(x)));
  assert.ok(plan.warnings.includes("Sprint S8 will be created"));
  assert.deepEqual(plan.summary, { committed: { tasks: 5, points: 11 }, done: { tasks: 2, points: 8 }, toBacklog: ["Core-b2", "Core-b1"], toNext: ["Core-n1"] });
  assert.match(plan.planHash, /^[0-9a-f]{64}$/);
  // Same board and request: same hash; the plan itself is a valid request with the same hash.
  assert.equal(planSprintClose(board, "S7", { [n1]: "next" }).planHash, plan.planHash);
  assert.equal(planSprintClose(board, plan.id, plan.actions, plan.resetStatus).planHash, plan.planHash);
  assert.notEqual(planSprintClose(board, "S7").planHash, plan.planHash);
  assert.equal(planSprintClose(board, "S7", { [n1]: "next" }, null).unfinished.find((u) => u.id === "Core-n1")!.to, "3-in-progress");
  // Bad input throws.
  assert.throws(() => planSprintClose(board, "S9"), /S9 does not exist/);
  assert.throws(() => planSprintClose(board, "S7", { [n1]: "drop" as never }), /Bad action/);
  assert.throws(() => planSprintClose({ ...board, sprints: undefined }, "S7"), /Sprints are off/);
  // A path that is not an unfinished task of the sprint blocks.
  assert.match(planSprintClose(board, "S7", { [join(w.tasks, "5-done", "Core-d1.md")]: "next" }).blockers[0], /Not an unfinished task/);
});

test("planSprintClose: missing columns are refused or fall back clearly", async () => {
  const w = workspace({ ...CLOSE, config: { sprint: { doneColumns: ["9-shipped"], resetStatus: "2-todo" } } });
  const board = await loadBoard(w.tasks);
  // doneColumns naming no real column (the read fell back to the defaults, which are checked here): blocked.
  const noDone = { ...board, columns: board.columns.filter((c) => c.id !== "5-done" && c.id !== "6-deploy") };
  assert.match(planSprintClose(noDone, "S7").blockers.join(), /None of the done statuses \(5-done, 6-deploy\) exist/);
  // Default resetStatus naming a column that does not exist: keep the status, with a warning.
  const noTodo = { ...board, columns: board.columns.filter((c) => c.id !== "2-todo") };
  const p = planSprintClose(noTodo, "S7", {}, undefined);
  assert.equal(p.resetStatus, null);
  assert.ok(p.warnings.some((x) => /Status 2-todo does not exist; carried-over tasks keep their status/.test(x)));
  // An explicit one blocks.
  assert.match(planSprintClose(board, "S7", {}, "8-nope").blockers.join(), /Status 8-nope does not exist/);
  assert.match(planSprintClose(board, "S7", {}, "5-done").blockers.join(), /cannot be reset to a done status/);
});

test("applySprintClose: moves, edits, summary, next sprint, ONE commit by pathspec; done tasks untouched", async () => {
  const w = workspace(CLOSE);
  const doneBefore = [w.read("5-done/Core-d1.md"), w.read("6-deploy/Core-d2.md")];
  const n1 = join(w.tasks, "3-in-progress", "Core-n1.md");
  const plan = planSprintClose(await loadBoard(w.tasks), "S7", { [n1]: "next" });
  const head = w.head();
  const r = await applySprintClose(w.tasks, { id: "S7", actions: { [n1]: "next" } }, plan.planHash, { today: "2026-11-29" });
  assert.equal(r.committed, true);
  assert.equal(r.message, "sprint(S7): complete, 2 done, 2 to backlog, 1 to S8");
  assert.equal(w.g("rev-list", "--count", `${head}..HEAD`), "1");
  assert.equal(w.g("log", "-1", "--format=%s"), r.message);
  const stat = w.g("show", "--name-status", "--format=", "-M", "HEAD").split("\n").sort();
  assert.equal(stat.length, 5);
  assert.ok(stat.includes("A\tTasks/_sprints/S8.md"));
  assert.ok(stat.includes("M\tTasks/_sprints/S7.md"));
  assert.match(stat.find((l) => l.includes("Core-b2"))!, /^R\d+\tTasks\/2-todo\/Core-b2\.md\tTasks\/1-backlog\/Core-b2\.md$/);
  assert.match(stat.find((l) => l.includes("Core-b1"))!, /^R\d+\tTasks\/3-in-progress\/Core-b1\.md\tTasks\/1-backlog\/Core-b1\.md$/);
  assert.match(stat.find((l) => l.includes("Core-n1"))!, /^R\d+\tTasks\/3-in-progress\/Core-n1\.md\tTasks\/2-todo\/Core-n1\.md$/);
  assert.equal(w.status(), "M other.txt");

  assert.deepEqual([w.read("5-done/Core-d1.md"), w.read("6-deploy/Core-d2.md")], doneBefore);
  assert.doesNotMatch(w.read("1-backlog/Core-b1.md"), /Sprint/);
  assert.match(w.read("1-backlog/Core-b1.md"), /Started \/ updated:\*\* 2026-11-01 \/ 2026-11-29/);
  assert.match(w.read("2-todo/Core-n1.md"), /- \*\*Sprint:\*\* S8\n/);
  assert.match(w.read("2-todo/Core-other.md"), /Sprint:\*\* S6/);
  const s7 = w.read("_sprints/S7.md");
  assert.match(s7, /- \*\*State:\*\* closed\n/);
  assert.match(s7, /## Summary\n- Closed: 2026-11-29\n- Committed: 5 tasks · 11 pts · Done: 2 · 8 pts\n- To backlog: Core-b2, Core-b1 · To S8: Core-n1\n$/);
  const sprints = await readSprints(w.tasks);
  assert.deepEqual(sprints.map((s) => [s.id, s.state]), [["S7", "closed"], ["S8", "planned"]]);
});

test("applySprintClose: an existing planned next sprint is reused", async () => {
  const w = workspace({ ...CLOSE, config: { sprint: { unfinished: "next", resetStatus: null } }, sprints: { S7: SPRINT("S7", "active"), S8: SPRINT("S8", "planned") } });
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  assert.equal(plan.createNext, false);
  const r = await applySprintClose(w.tasks, { id: "S7" }, plan.planHash);
  assert.equal(r.message, "sprint(S7): complete, 2 done, 0 to backlog, 3 to S8");
  assert.equal(r.moved.length, 0);
  assert.match(w.read("3-in-progress/Core-b1.md"), /Sprint:\*\* S8/);
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD").split("\n").length, 4);
});

test("applySprintClose: empty sprint closes with only the sprint file", async () => {
  const w = workspace({ sprints: { S7: SPRINT("S7", "active") }, tasks: { "2-todo/Core-x": "" } });
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  assert.equal(plan.createNext, false);
  const r = await applySprintClose(w.tasks, plan, plan.planHash);
  assert.equal(r.message, "sprint(S7): complete, 0 done, 0 to backlog, 0 to S8");
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD"), "Tasks/_sprints/S7.md");
  assert.match(w.read("_sprints/S7.md"), /Committed: 0 tasks · 0 pts · Done: 0 · 0 pts\n- To backlog: none · To S8: none/);
});

test("applySprintClose: all done touches no task", async () => {
  const w = workspace({ sprints: { S7: SPRINT("S7", "active") }, tasks: { "5-done/Core-d": "- **Sprint:** S7\n" } });
  const before = w.read("5-done/Core-d.md");
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  const r = await applySprintClose(w.tasks, plan, plan.planHash);
  assert.deepEqual([r.moved, r.edited], [[], []]);
  assert.equal(w.read("5-done/Core-d.md"), before);
  assert.equal(w.g("show", "--name-only", "--format=", "HEAD"), "Tasks/_sprints/S7.md");
});

test("applySprintClose: a name clash in the target folder blocks, nothing changes", async () => {
  const w = workspace({ sprints: { S7: SPRINT("S7", "active") }, tasks: { "2-todo/Core-x": "- **Sprint:** S7\n", "1-backlog/Core-x": "" } });
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  assert.match(plan.blockers.join(), /Core-x\.md already exists in backlog/);
  const before = snapshot(w.root);
  const head = w.head();
  await assert.rejects(applySprintClose(w.tasks, plan, plan.planHash), (e: unknown) => e instanceof SprintCloseError && e.kind === "blocked");
  assert.equal(snapshot(w.root), before);
  assert.equal(w.head(), head);
});

test("applySprintClose: untracked task files are moved but never committed", async () => {
  const w = workspace({ sprints: { S7: SPRINT("S7", "active") }, tasks: { "2-todo/Core-t": "- **Sprint:** S7\n" }, untracked: { "3-in-progress/Core-u": "- **Sprint:** S7\n" } });
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  const r = await applySprintClose(w.tasks, plan, plan.planHash);
  assert.equal(r.moved.length, 2);
  const files = w.g("show", "--no-renames", "--name-only", "--format=", "HEAD").split("\n").sort();
  assert.deepEqual(files, ["Tasks/1-backlog/Core-t.md", "Tasks/2-todo/Core-t.md", "Tasks/_sprints/S7.md"]);
  assert.ok(existsSync(join(w.tasks, "1-backlog", "Core-u.md")));
  assert.match(w.status(), /\?\? Tasks\/1-backlog\/Core-u\.md/);
});

test("applySprintClose: autoCommit off writes everything and makes no commit", async () => {
  const w = workspace(CLOSE);
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  const head = w.head();
  const r = await applySprintClose(w.tasks, plan, plan.planHash, { commit: false });
  assert.equal(r.committed, false);
  assert.equal(w.head(), head);
  assert.ok(existsSync(join(w.tasks, "1-backlog", "Core-b1.md")));
  assert.match(w.read("_sprints/S7.md"), /State:\*\* closed/);
});

test("applySprintClose: a stale hash is refused and nothing changes", async () => {
  const w = workspace(CLOSE);
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  w.g("mv", "Tasks/2-todo/Core-b2.md", "Tasks/5-done/Core-b2.md"); // someone finished a task meanwhile
  const before = snapshot(w.root);
  await assert.rejects(applySprintClose(w.tasks, plan, plan.planHash), (e: unknown) => e instanceof SprintCloseError && e.kind === "stale");
  assert.equal(snapshot(w.root), before);
  await assert.rejects(applySprintClose(w.tasks, plan, "0".repeat(64)), /changed since the plan/);
});

test("applySprintClose: closing a sprint that is not active is refused", async () => {
  const w = workspace({ sprints: { S6: SPRINT("S6", "closed"), S7: SPRINT("S7", "planned") }, tasks: { "2-todo/Core-x": "- **Sprint:** S7\n" } });
  for (const id of ["S6", "S7"]) {
    const plan = planSprintClose(await loadBoard(w.tasks), id);
    assert.match(plan.blockers[0], /only the active sprint can be completed/);
    await assert.rejects(applySprintClose(w.tasks, plan, plan.planHash), /was not completed/);
  }
  assert.ok(existsSync(join(w.tasks, "2-todo", "Core-x.md")));
});

test("applySprintClose: a failing commit (hook) restores every file and the index", async () => {
  const w = workspace(CLOSE);
  const hook = join(w.root, ".git", "hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  const n1 = join(w.tasks, "3-in-progress", "Core-n1.md");
  const plan = planSprintClose(await loadBoard(w.tasks), "S7", { [n1]: "next" });
  const before = snapshot(w.root);
  const head = w.head();
  await assert.rejects(applySprintClose(w.tasks, { id: "S7", actions: { [n1]: "next" } }, plan.planHash));
  assert.equal(snapshot(w.root), before);
  assert.equal(w.head(), head);
  assert.equal(w.status(), "M other.txt");
});

test("applySprintClose: a failure halfway through the moves puts everything back", { skip: process.getuid?.() === 0 ? "root ignores file modes" : false }, async () => {
  const w = workspace(CLOSE);
  const plan = planSprintClose(await loadBoard(w.tasks), "S7");
  chmodSync(join(w.tasks, "3-in-progress", "Core-n1.md"), 0o444); // the third task cannot be rewritten
  const before = snapshot(w.root);
  const head = w.head();
  await assert.rejects(applySprintClose(w.tasks, plan, plan.planHash), /EACCES|permission/i);
  assert.equal(snapshot(w.root), before);
  assert.equal(w.head(), head);
  assert.equal(w.status(), "M other.txt");
  assert.ok(existsSync(join(w.tasks, "2-todo", "Core-b2.md")) && !existsSync(join(w.tasks, "1-backlog", "Core-b2.md")));
});

test("parseTask after setTaskSprint matches the header", async () => {
  const w = workspace({ sprints: { S2: SPRINT("S2", "planned") }, tasks: { "2-todo/Core-a": "- **Sprint:** s9\n" } });
  await setTaskSprint(await w.task("Core-a"), "S2");
  const t = parseTask(join(w.tasks, "2-todo", "Core-a.md"), "2-todo", w.read("2-todo/Core-a.md"));
  assert.equal(t.sprint, "S2");
  assert.equal((w.read("2-todo/Core-a.md").match(/Sprint/g) ?? []).length, 1);
});
