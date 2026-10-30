import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addSubtask, assertRegularFile, createTask, loadBoard, moveTask, setOwner, toggleSubtask, assignIds, setColumnColor, addPerson } from "../src/index.ts";

const TASK = "# Victim\n\n- **Owner:** Sam\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Sub-tasks\n- [ ] one\n";

function ws() {
  const root = mkdtempSync(join(tmpdir(), "gitask-sym-"));
  const tasks = join(root, "Tasks");
  for (const c of ["1-backlog", "2-todo"]) mkdirSync(join(tasks, c), { recursive: true });
  const victim = join(root, "victim.md");
  writeFileSync(victim, TASK);
  const link = join(tasks, "1-backlog", "evil.md");
  symlinkSync(victim, link);
  writeFileSync(join(tasks, "1-backlog", "good.md"), TASK.replace("Victim", "Good"));
  return { root, tasks, victim, link };
}

test("loadBoard skips symlinked task files, directories named x.md and dangling links without throwing", async () => {
  const { tasks, root } = ws();
  mkdirSync(join(tasks, "1-backlog", "dir.md"));
  symlinkSync(join(root, "nope.md"), join(tasks, "1-backlog", "dangling.md"));
  const b = await loadBoard(tasks);
  assert.deepEqual(b.columns[0].tasks.map((t) => t.id), ["good"]);
});

test("a symlinked task file is never rewritten through the board writers", async () => {
  const { tasks, victim, link } = ws();
  // Build the Task by hand (as an attacker-influenced path could be) and try every writer.
  const { parseTask } = await import("../src/index.ts");
  const t = parseTask(link, "1-backlog", TASK);
  await assert.rejects(addSubtask(t, "pwned", {}, { commit: false }), /regular file/);
  await assert.rejects(toggleSubtask(t, 0, { commit: false }), /regular file/);
  await assert.rejects(setOwner(t, "someone", { commit: false }), /regular file/);
  await assert.rejects(moveTask(tasks, link, "2-todo", { commit: false }), /regular file/);
  assert.equal(readFileSync(victim, "utf8"), TASK);
  assert.ok(existsSync(link));
});

test("assignIds does not touch a symlinked task", async () => {
  const { tasks, victim } = ws();
  await assignIds(tasks, { commit: false });
  assert.equal(readFileSync(victim, "utf8"), TASK);
});

test("assertRegularFile: symlink, directory, and file outside the Tasks dir are refused", async () => {
  const { tasks, link, root } = ws();
  await assert.rejects(assertRegularFile(link, tasks), /not a regular file/);
  await assert.rejects(assertRegularFile(join(tasks, "1-backlog"), tasks), /not a regular file/);
  await assert.rejects(assertRegularFile(join(root, "victim.md"), tasks), /outside the Tasks folder/);
  await assertRegularFile(join(tasks, "1-backlog", "good.md"), tasks);
});

test("moveTask without git refuses to overwrite a same-named file in the target column", async () => {
  const { tasks } = ws();
  writeFileSync(join(tasks, "2-todo", "good.md"), "# Other\n");
  await assert.rejects(moveTask(tasks, join(tasks, "1-backlog", "good.md"), "2-todo", { commit: false }), /already exists/);
  assert.equal(readFileSync(join(tasks, "2-todo", "good.md"), "utf8"), "# Other\n");
  assert.ok(existsSync(join(tasks, "1-backlog", "good.md")));
});

test("createTask does not write through a dangling symlink or read a symlinked template", async () => {
  const { tasks, root } = ws();
  const outside = join(root, "outside.md");
  symlinkSync(outside, join(tasks, "1-backlog", "New-one.md"));
  await assert.rejects(createTask(tasks, "1-backlog", "New-one"), /already exists/);
  assert.equal(existsSync(outside), false);
  writeFileSync(join(root, "secret.txt"), "TOPSECRET");
  symlinkSync(join(root, "secret.txt"), join(tasks, "_TEMPLATE.md"));
  const p = await createTask(tasks, "1-backlog", "Fresh");
  assert.ok(!readFileSync(p, "utf8").includes("TOPSECRET"));
});

test("gitask.json symlink is not written through", async () => {
  const { tasks, root } = ws();
  writeFileSync(join(root, "cfg.json"), "{}");
  symlinkSync(join(root, "cfg.json"), join(tasks, "gitask.json"));
  await assert.rejects(setColumnColor(tasks, "1-backlog", "#ff0000", { commit: false }), /regular file/);
  await assert.rejects(addPerson(tasks, "Ann Roe", { commit: false }), /regular file/);
  assert.equal(readFileSync(join(root, "cfg.json"), "utf8"), "{}");
  assert.deepEqual(readdirSync(tasks).includes("gitask.json"), true);
});
