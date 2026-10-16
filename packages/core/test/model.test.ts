import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTask, parseDue, loadBoard, toggleSubtask } from "../src/index.ts";

const TASK = `# Core-demo

- **Owner:** Sam
- **Tier:** T2
- **Claimed by:** none
- **Started / updated:** 2026-01-01 / 2026-01-01
- **Due:** 2026-03-05
- **Depends on:** Core-base, \`Ops-gone\`, Core-demo and Core-other.

## Gates
- [ ] G1 scope  - [x] G2 static  - [ ] G3 tests

## Done when
- [x] first
  - [ ] nested second
* [X] third
\`\`\`
- [ ] inside a fence
\`\`\`
- [ ] fourth
`;

const parse = (c = TASK, known = new Set(["Core-base", "Core-other", "Core-demo"])) =>
  parseTask("/x/2-todo/Core-demo.md", "2-todo", c, known);

test("sub-tasks: section, text, state, line; fences skipped; gate rows split", () => {
  const t = parse();
  assert.deepEqual(
    t.subtasks.map((s) => [s.section, s.text, s.checked, s.line]),
    [
      ["Gates", "G1 scope", false, 11],
      ["Gates", "G2 static", true, 11],
      ["Gates", "G3 tests", false, 11],
      ["Done when", "first", true, 14],
      ["Done when", "nested second", false, 15],
      ["Done when", "third", true, 16],
      ["Done when", "fourth", false, 20],
    ],
  );
});

test("progress counts Done when only", () => {
  assert.deepEqual(parse().progress, { done: 2, total: 4 });
  assert.deepEqual(parse("# A\n\n## Goal\n- [x] a\n").progress, { done: 0, total: 0 });
});

test("Due: real dates only, never throws", () => {
  assert.equal(parse().due, "2026-03-05");
  for (const bad of ["none", "", "2026-13-01", "2026-02-30", "soon", "03/05/2026", "<YYYY-MM-DD, optional>"]) {
    assert.equal(parseDue(bad), undefined, bad);
  }
  assert.equal(parseDue("2026-03-05 (hard)"), "2026-03-05");
  assert.equal(parse(TASK.replace(/- \*\*Due:.*\n/, "")).due, undefined);
});

test("Depends on: existing ids only, no self, no duplicates", () => {
  assert.deepEqual(parse().dependsOn, ["Core-base", "Core-other"]);
  assert.deepEqual(parse(TASK, new Set()).dependsOn, []);
});

test("Depends on accepts .md names; a fence is closed only by its own marker", () => {
  assert.deepEqual(parse(TASK.replace("Core-base,", "Core-base.md,")).dependsOn, ["Core-base", "Core-other"]);
  const t = parse("# A\n\n## Done when\n```\n~~~\n- [ ] hidden\n```\n- [ ] shown\n");
  assert.deepEqual(t.subtasks.map((x) => x.text), ["shown"]);
});

test("loadBoard resolves dependsOn across columns", async () => {
  const tasks = join(mkdtempSync(join(tmpdir(), "gitask-m-")), "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  mkdirSync(join(tasks, "3-in-progress"));
  writeFileSync(join(tasks, "2-todo", "Core-demo.md"), TASK);
  writeFileSync(join(tasks, "3-in-progress", "Core-base.md"), "# Core-base\n");
  const b = await loadBoard(tasks);
  assert.deepEqual(b.columns[0].tasks[0].dependsOn, ["Core-base"]);
  assert.deepEqual(b.columns[1].tasks[0].subtasks, []);
});

function repo(content: string, initGit = true) {
  const root = mkdtempSync(join(tmpdir(), "gitask-t-"));
  const dir = join(root, "Tasks", "2-todo");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "Core-demo.md");
  writeFileSync(path, content);
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  if (initGit) {
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
    g("add", "-A");
    g("commit", "-q", "-m", "init");
  }
  return { root, path, g };
}

test("toggle changes exactly one character and commits only that file", async () => {
  const { root, path, g } = repo(TASK);
  writeFileSync(join(root, "other.txt"), "dirty");
  g("add", "other.txt");
  const task = parseTask(path, "2-todo", TASK);
  const idx = task.subtasks.findIndex((s) => s.text === "fourth");
  const r = await toggleSubtask(task, idx);
  assert.equal(r.checked, true);
  assert.equal(r.committed, true);
  const after = readFileSync(path, "utf8");
  assert.equal(after, TASK.replace("- [ ] fourth", "- [x] fourth"));
  assert.match(g("log", "-1", "--format=%s"), /^task\(Core-demo\): checked "fourth"/);
  assert.equal(g("show", "--name-only", "--format=", "HEAD").trim(), "Tasks/2-todo/Core-demo.md");
  assert.match(g("status", "--porcelain"), /^M\s+other\.txt/m); // still staged, not swept in
});

test("toggle works on a gate row (middle checkbox) and unchecks", async () => {
  const { path } = repo(TASK);
  const task = parseTask(path, "2-todo", TASK);
  await toggleSubtask(task, 1, { commit: false });
  assert.match(readFileSync(path, "utf8"), /- \[ \] G1 scope {2}- \[ \] G2 static {2}- \[ \] G3 tests/);
});

test("toggle keeps CRLF endings byte for byte", async () => {
  const crlf = TASK.replaceAll("\n", "\r\n");
  const { path } = repo(crlf);
  const task = parseTask(path, "2-todo", crlf);
  const idx = task.subtasks.findIndex((s) => s.text === "fourth");
  await toggleSubtask(task, idx);
  assert.equal(readFileSync(path, "utf8"), crlf.replace("- [ ] fourth", "- [x] fourth"));
});

test("toggle refuses when the line moved or changed since it was read", async () => {
  const { path } = repo(TASK);
  const task = parseTask(path, "2-todo", TASK);
  const idx = task.subtasks.findIndex((s) => s.text === "fourth");
  writeFileSync(path, "# inserted\n" + TASK);
  await assert.rejects(toggleSubtask(task, idx), /changed since it was read/);
  assert.equal(readFileSync(path, "utf8"), "# inserted\n" + TASK);
  writeFileSync(path, TASK.replace("- [ ] fourth", "- [x] fourth"));
  await assert.rejects(toggleSubtask(task, idx), /changed since it was read/);
  await assert.rejects(toggleSubtask(task, 99), /No sub-task/);
});

test("toggle outside git just writes the file", async () => {
  const { path } = repo(TASK, false);
  const task = parseTask(path, "2-todo", TASK);
  const r = await toggleSubtask(task, 0);
  assert.equal(r.committed, false);
  assert.match(readFileSync(path, "utf8"), /- \[x\] G1 scope/);
});

test("500 tasks and an empty board", async () => {
  const tasks = join(mkdtempSync(join(tmpdir(), "gitask-m-")), "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  for (let i = 0; i < 500; i++) writeFileSync(join(tasks, "2-todo", `Core-t${i}.md`), TASK.replace("Core-demo", `Core-t${i}`));
  const b = await loadBoard(tasks);
  assert.equal(b.columns[0].tasks.length, 500);
  const empty = join(mkdtempSync(join(tmpdir(), "gitask-m-")), "Tasks");
  mkdirSync(empty);
  assert.deepEqual((await loadBoard(empty)).columns, []);
});
