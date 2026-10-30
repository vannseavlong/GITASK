import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveTasksDir } from "../src/tasks-dir.ts";

test("tasksDir inside the workspace resolves; escapes and absolute paths elsewhere are refused", () => {
  const root = resolve("/ws/project");
  assert.deepEqual(resolveTasksDir(root, "Tasks"), { ok: true, dir: join(root, "Tasks") });
  assert.deepEqual(resolveTasksDir(root, "docs/Tasks"), { ok: true, dir: join(root, "docs", "Tasks") });
  assert.deepEqual(resolveTasksDir(root, "a/../Tasks"), { ok: true, dir: join(root, "Tasks") });
  for (const bad of ["..", "../x", "a/../../x", "/etc", "../project-evil/Tasks"]) {
    const r = resolveTasksDir(root, bad);
    assert.equal(r.ok, false, bad);
    assert.match((r as { error: string }).error, /outside the workspace/);
  }
});

test("package.json: gitask.tasksDir cannot be set by a workspace settings file alone", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.contributes.configuration.properties["gitask.tasksDir"].scope, "machine-overridable");
});
