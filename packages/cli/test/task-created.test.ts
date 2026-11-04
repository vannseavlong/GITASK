import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/handler.ts";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-tc-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  writeFileSync(join(tasks, "1-backlog", ".gitkeep"), "");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks"); g("commit", "-q", "-m", "init");
  return tasks;
}

test("a successful create replies taskCreated with the new file path", async () => {
  const tasks = repo();
  const h = createHandler({ dir: tasks, commit: false });
  const r = await h.handle({ type: "new", column: "1-backlog", id: "Web-login", title: "Login" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.reply, { type: "taskCreated", path: join(tasks, "1-backlog", "Web-login.md") });
  assert.equal(r.changed, true);
});

test("a failed create sends no taskCreated", async () => {
  const tasks = repo();
  const h = createHandler({ dir: tasks, commit: false });
  await h.handle({ type: "new", column: "1-backlog", id: "Dup" });
  const r = await h.handle({ type: "new", column: "1-backlog", id: "Dup" });
  assert.equal(r.reply?.type, "error");
});
