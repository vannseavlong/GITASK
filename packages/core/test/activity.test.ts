import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { taskActivity, taskActivityCached } from "../src/activity.ts";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-act-"));
  mkdirSync(join(root, "Tasks", "2-todo"), { recursive: true });
  mkdirSync(join(root, "Tasks", "3-in-progress"), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  const commit = (date: string, msg: string, ...paths: string[]) => {
    g("add", "-A", "--", ...paths);
    execFileSync("git", ["commit", "-q", "-m", msg], { cwd: root, env: { ...process.env, GIT_COMMITTER_DATE: `${date}T12:00:00`, GIT_AUTHOR_DATE: `1999-01-01T12:00:00` } });
  };
  return { root, tasks: join(root, "Tasks"), g, commit };
}
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

test("counts commits per committer day, ignores files outside Tasks and old commits", async () => {
  const { root, tasks, commit } = repo();
  writeFileSync(join(tasks, "2-todo", "Old.md"), "o");
  commit(day(400), "too old", "Tasks/2-todo/Old.md");
  writeFileSync(join(tasks, "2-todo", "A.md"), "a");
  commit(day(5), "one", "Tasks/2-todo/A.md");
  writeFileSync(join(tasks, "2-todo", "A.md"), "a2");
  writeFileSync(join(tasks, "2-todo", "B.md"), "b");
  commit(day(5), "two (two files, one commit)", "Tasks/2-todo/A.md", "Tasks/2-todo/B.md");
  writeFileSync(join(tasks, "2-todo", "B.md"), "b2");
  commit(day(2), "three", "Tasks/2-todo/B.md");
  writeFileSync(join(root, "README.md"), "x");
  commit(day(1), "outside", "README.md");
  assert.deepEqual(await taskActivity(tasks), [{ date: day(5), count: 2 }, { date: day(2), count: 1 }]);
  assert.deepEqual(await taskActivity(tasks, { days: 3 }), [{ date: day(2), count: 1 }]);
  assert.equal((await taskActivity(tasks, { days: 500 })).length, 3);
});

test("a rename (move between status folders) counts as one commit", async () => {
  const { tasks, g, commit } = repo();
  writeFileSync(join(tasks, "2-todo", "A é.md"), "a");
  commit(day(3), "add", "Tasks/2-todo/A é.md");
  g("mv", "Tasks/2-todo/A é.md", "Tasks/3-in-progress/A é.md");
  commit(day(1), "move", "Tasks");
  assert.deepEqual(await taskActivity(tasks), [{ date: day(3), count: 1 }, { date: day(1), count: 1 }]);
  void renameSync;
});

test("empty repo, missing dir and non-git dir give []", async () => {
  const { tasks } = repo();
  assert.deepEqual(await taskActivity(tasks), []);
  assert.deepEqual(await taskActivity(mkdtempSync(join(tmpdir(), "gitask-nogit-"))), []);
  assert.deepEqual(await taskActivity("/definitely/not/here"), []);
  assert.deepEqual(await taskActivityCached(mkdtempSync(join(tmpdir(), "gitask-nogit-"))), []);
});

test("cached by HEAD: same result until a new commit", async () => {
  const { tasks, commit } = repo();
  writeFileSync(join(tasks, "2-todo", "A.md"), "a");
  commit(day(1), "one", "Tasks/2-todo/A.md");
  const a = await taskActivityCached(tasks);
  assert.equal(await taskActivityCached(tasks), a);
  writeFileSync(join(tasks, "2-todo", "A.md"), "a2");
  commit(day(1), "two", "Tasks/2-todo/A.md");
  assert.deepEqual(await taskActivityCached(tasks), [{ date: day(1), count: 2 }]);
});
