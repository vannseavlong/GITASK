import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDate } from "../src/date.ts";
import { parseTask, loadBoard, moveTask, createTask, bumpUpdated, appendChangelog } from "../src/index.ts";

const TASK = `# Core-demo

- **Repo:** GITASK
- **Owner:** Sam
- **Tier:** T2 · new feature
- **Claimed by:** none
- **Started / updated:** 2026-01-01 / 2026-01-01

## Goal
Make a demo.
`;

function workspace(initGit: boolean) {
  const root = mkdtempSync(join(tmpdir(), "gitask-"));
  const tasks = join(root, "Tasks");
  for (const d of ["1-backlog", "2-todo", "3-in-progress", "_inbox", "_plans"]) mkdirSync(join(tasks, d), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "Core-demo.md"), TASK);
  writeFileSync(join(root, "CHANGELOG.md"), "# Changelog\n\nintro\n");
  if (initGit) {
    const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
    g("add", "-A");
    g("commit", "-q", "-m", "init");
  }
  return { root, tasks };
}

test("parseTask reads title, fields, tier, claim", () => {
  const t = parseTask("/x/2-todo/Core-demo.md", "2-todo", TASK);
  assert.equal(t.title, "Core-demo");
  assert.equal(t.prefix, "Core");
  assert.equal(t.tier, "T2");
  assert.equal(t.owner, "Sam");
  assert.equal(t.claimedBy, undefined);
  const c = parseTask("/x/a.md", "2-todo", TASK.replace("none", "agent-1, 2026-01-02"));
  assert.equal(c.claimedBy, "agent-1, 2026-01-02");
});

test("loadBoard: numbered folders only, sorted numerically", async () => {
  const { tasks } = workspace(false);
  mkdirSync(join(tasks, "10-late"));
  const b = await loadBoard(tasks);
  assert.deepEqual(b.columns.map((c) => c.id), ["1-backlog", "2-todo", "3-in-progress", "10-late"]);
  assert.equal(b.columns[1].tasks[0].id, "Core-demo");
});

test("bumpUpdated changes only the second date", () => {
  assert.match(bumpUpdated(TASK, "2026-02-02"), /2026-01-01 \/ 2026-02-02/);
  assert.equal(bumpUpdated("no header", "2026-02-02"), "no header");
});

test("moveTask in git: renames, bumps date, commits only that path", async () => {
  const { root, tasks } = workspace(true);
  writeFileSync(join(root, "unrelated.txt"), "dirty"); // must not be committed
  execFileSync("git", ["add", "unrelated.txt"], { cwd: root });
  const res = await moveTask(tasks, join(tasks, "2-todo", "Core-demo.md"), "3-in-progress", { today: "2026-03-03" });
  assert.equal(res.committed, true);
  assert.ok(existsSync(join(tasks, "3-in-progress", "Core-demo.md")));
  assert.ok(!existsSync(join(tasks, "2-todo", "Core-demo.md")));
  assert.match(readFileSync(join(tasks, "3-in-progress", "Core-demo.md"), "utf8"), /2026-01-01 \/ 2026-03-03/);
  const log = execFileSync("git", ["log", "-1", "--format=%s"], { cwd: root }).toString().trim();
  assert.equal(log, "task(Core-demo): todo → in-progress");
  const files = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: root }).toString();
  assert.ok(!files.includes("unrelated.txt"));
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: root }).toString();
  assert.match(status, /A\s+unrelated\.txt/); // still staged, untouched
});

test("moveTask without git or with commit:false just moves", async () => {
  const a = workspace(false);
  const r = await moveTask(a.tasks, join(a.tasks, "2-todo", "Core-demo.md"), "1-backlog");
  assert.equal(r.committed, false);
  assert.ok(existsSync(join(a.tasks, "1-backlog", "Core-demo.md")));
  const b = workspace(true);
  const r2 = await moveTask(b.tasks, join(b.tasks, "2-todo", "Core-demo.md"), "1-backlog", { commit: false });
  assert.equal(r2.committed, false);
  assert.equal(execFileSync("git", ["log", "--oneline"], { cwd: b.root }).toString().trim().split("\n").length, 1);
});

test("moveTask to same column is a no-op", async () => {
  const { tasks } = workspace(true);
  const r = await moveTask(tasks, join(tasks, "2-todo", "Core-demo.md"), "2-todo");
  assert.equal(r.committed, false);
});

test("createTask uses fallback, rejects bad ids and duplicates", async () => {
  const { tasks } = workspace(false);
  const p = await createTask(tasks, "1-backlog", "Ext-new-thing", { owner: "Sam", today: "2026-04-04" });
  const body = readFileSync(p, "utf8");
  assert.match(body, /^# Ext-new-thing/);
  assert.match(body, /2026-04-04 \/ 2026-04-04/);
  await assert.rejects(createTask(tasks, "1-backlog", "Ext-new-thing"), /already exists/);
  await assert.rejects(createTask(tasks, "1-backlog", "../evil"), /Invalid/);
});

test("createTask fills the real template", async () => {
  const { tasks } = workspace(false);
  writeFileSync(join(tasks, "_TEMPLATE.md"), "# <Task title>\n\n- **Owner:** {{OWNER}}\n- **Started / updated:** <date> / <date>\n");
  const body = readFileSync(await createTask(tasks, "2-todo", "Core-x", { owner: "Kim", today: "2026-05-05" }), "utf8");
  assert.equal(body, "# Core-x\n\n- **Owner:** Kim\n- **Started / updated:** 2026-05-05 / 2026-05-05\n");
});

test("appendChangelog is idempotent and inserts above older entries", async () => {
  const { root, tasks } = workspace(false);
  const cl = join(root, "CHANGELOG.md");
  const tp = join(tasks, "2-todo", "Core-demo.md");
  assert.equal(await appendChangelog(cl, tp, root, { date: "2026-06-06" }), true);
  assert.equal(await appendChangelog(cl, tp, root, { date: "2026-06-06" }), false);
  const log = readFileSync(cl, "utf8");
  assert.match(log, /## 2026-06-06 · \[Core\] feat: Core-demo/);
  assert.match(log, /- Task: Tasks\/2-todo\/Core-demo\.md/);
  assert.match(log, /- What changed: Make a demo\./);
  assert.equal(log.match(/^## /gm)?.length, 1);
});

test("localDate uses local calendar fields", () => {
  assert.equal(localDate(new Date(2026, 9, 17, 0, 30)), "2026-10-17"); // 00:30 local is still the 17th
});
