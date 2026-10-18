import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initTasks, loadBoard, createTask, STATUS_FOLDERS } from "../src/index.ts";

test("initTasks scaffolds a board in a project with no Tasks folder", async () => {
  const tasks = join(mkdtempSync(join(tmpdir(), "gitask-init-")), "Tasks");
  const { created } = await initTasks(tasks);
  assert.equal(created.length, STATUS_FOLDERS.length + 1);

  const board = await loadBoard(tasks);
  assert.deepEqual(board.columns.map((c) => c.id), [...STATUS_FOLDERS]);
  assert.ok(existsSync(join(tasks, "1-backlog", ".gitkeep")));

  const file = await createTask(tasks, "1-backlog", "First", { owner: "Sam", today: "2026-01-01" });
  const body = readFileSync(file, "utf8");
  assert.match(body, /^# First$/m);
  assert.match(body, /\*\*Owner:\*\* Sam/);
});

test("initTasks is idempotent and never overwrites", async () => {
  const tasks = join(mkdtempSync(join(tmpdir(), "gitask-init-")), "Tasks");
  await initTasks(tasks);
  writeFileSync(join(tasks, "_TEMPLATE.md"), "# mine\n");
  const again = await initTasks(tasks);
  assert.deepEqual(again.created, []);
  assert.equal(readFileSync(join(tasks, "_TEMPLATE.md"), "utf8"), "# mine\n");
});
