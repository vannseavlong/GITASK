import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setOwnerField, setOwner, addSubtask, toggleSubtask, moveTask, createTask, parseTask, fillTemplate } from "../src/index.ts";

const NASTY = ["A$&B $1", "x $$ y", "q $' r", "p $` s", "$<name> $0 $10"];

function repo(file = "A-one") {
  const root = mkdtempSync(join(tmpdir(), "gitask-dollar-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  mkdirSync(join(tasks, "3-in-progress"), { recursive: true });
  const path = join(tasks, "2-todo", `${file}.md`);
  writeFileSync(path, `# T\n\n- **Owner:** Sam\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Sub-tasks\n- [ ] one\n`);
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "-A");
  g("commit", "-q", "-m", "init");
  return { root, tasks, path, g, task: () => parseTask(path, "2-todo", readFileSync(path, "utf8")) };
}

test("setOwnerField writes dollar sequences literally, new and existing line", () => {
  for (const name of NASTY) {
    const existing = setOwnerField("# T\n\n- **Owner:** Sam\n", name);
    assert.ok(existing.includes(`- **Owner:** ${name}\n`), existing);
    const fresh = setOwnerField("# T\n\n- **Started / updated:** a / b\n", name);
    assert.ok(fresh.includes(`- **Owner:** ${name}\n`), fresh);
  }
});

test("fillTemplate is literal and single pass", () => {
  assert.equal(fillTemplate("a {x} {y}", { x: "$&{y}", y: "$1" }), "a $&{y} $1");
  assert.equal(fillTemplate("{nope} {x}", { x: "1" }), "{nope} 1");
});

test("setOwner: owner line and commit message keep dollar sequences", async () => {
  for (const name of NASTY) {
    const r = repo();
    await setOwner(r.task(), name, { commit: true });
    assert.ok(readFileSync(r.path, "utf8").includes(`- **Owner:** ${name}\n`));
    assert.ok(r.g("log", "-1", "--format=%s").includes(`owner ${name}`), r.g("log", "-1", "--format=%s"));
  }
});

test("addSubtask and toggleSubtask commit messages keep dollar sequences", async () => {
  for (const text of NASTY) {
    const r = repo();
    await addSubtask(r.task(), text);
    assert.ok(r.g("log", "-1", "--format=%s").includes(`"${text}"`), r.g("log", "-1", "--format=%s"));
    const t = r.task();
    await toggleSubtask(t, t.subtasks.length - 1);
    assert.ok(r.g("log", "-1", "--format=%s").includes(`checked "${text}"`), r.g("log", "-1", "--format=%s"));
  }
});

test("moveTask commit message keeps a task id with dollar signs", async () => {
  const r = repo("a$&b");
  await moveTask(r.tasks, r.path, "3-in-progress");
  assert.equal(r.g("log", "-1", "--format=%s"), "task(a$&b): 2-todo → 3-in-progress".replace("2-todo", "todo").replace("3-in-progress", "in-progress"));
});

test("createTask keeps a dollar owner from the template", async () => {
  const r = repo();
  writeFileSync(join(r.tasks, "_TEMPLATE.md"), "# x\n\n- **Owner:** {{OWNER}}\n- **Started / updated:** d / d\n");
  const p = await createTask(r.tasks, "2-todo", "New-one", { owner: "A$&B $1", today: "2026-02-02" });
  assert.ok(readFileSync(p, "utf8").includes("- **Owner:** A$&B $1\n"));
});
