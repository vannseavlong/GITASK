import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deleteImpact, moveTask, assignIds, createTask, deleteColumn, deleteTask, loadBoard, parseTask, setIdField } from "../src/index.ts";

const body = (title: string, id?: string) =>
  `# ${title}\n\n${id ? `- **ID:** ${id}\n` : ""}- **Owner:** Sam\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Goal\nx\n\n## Done when\n- [ ] a\n`;

function ws(git: boolean) {
  const root = mkdtempSync(join(tmpdir(), "gitask-id-"));
  const tasks = join(root, "Tasks");
  for (const d of ["1-backlog", "2-todo", "3-done"]) mkdirSync(join(tasks, d), { recursive: true });
  writeFileSync(join(tasks, "1-backlog", "A-one.md"), body("A-one"));
  writeFileSync(join(tasks, "2-todo", "A-two.md"), body("A-two", "T-0007"));
  writeFileSync(join(tasks, "2-todo", "A-three.md"), body("A-three"));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  if (git) {
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
    g("add", "-A");
    g("commit", "-q", "-m", "init");
  }
  return { root, tasks, g };
}

test("parseTask reads displayId; malformed ID is ignored", () => {
  assert.equal(parseTask("/x/a.md", "1-a", body("a", "T-0042")).displayId, "T-0042");
  assert.equal(parseTask("/x/a.md", "1-a", body("a", "banana")).displayId, undefined);
  assert.equal(parseTask("/x/a.md", "1-a", body("a")).displayId, undefined);
});

test("setIdField inserts before first field, replaces existing, keeps CRLF", () => {
  assert.match(setIdField(body("a"), "T-0001"), /^# a\n\n- \*\*ID:\*\* T-0001\n- \*\*Owner:/);
  assert.equal(setIdField(body("a", "T-0002"), "T-0009").match(/\*\*ID:\*\*/g)?.length, 1);
  assert.match(setIdField(body("a", "T-0002"), "T-0009"), /ID:\*\* T-0009/);
  assert.ok(setIdField(body("a").replaceAll("\n", "\r\n"), "T-0001").includes("- **ID:** T-0001\r\n"));
  assert.match(setIdField("# only title\n", "T-0001"), /^# only title\n\n- \*\*ID:\*\* T-0001/);
});

test("createTask assigns max+1 across all columns", async () => {
  const { tasks } = ws(false);
  const f = await createTask(tasks, "1-backlog", "New-one");
  assert.equal(parseTask(f, "1-backlog", readFileSync(f, "utf8")).displayId, "T-0008");
  const g = await createTask(tasks, "3-done", "New-two");
  assert.equal(parseTask(g, "3-done", readFileSync(g, "utf8")).displayId, "T-0009");
});

test("createTask uses a template that has the ID placeholder", async () => {
  const { tasks } = ws(false);
  writeFileSync(join(tasks, "_TEMPLATE.md"), "# <t>\n\n- **ID:** <T-0001, assigned>\n- **Owner:** x\n\n## Goal\n");
  const f = await createTask(tasks, "1-backlog", "Tpl");
  const t = readFileSync(f, "utf8");
  assert.equal(t.match(/\*\*ID:\*\*/g)?.length, 1);
  assert.match(t, /ID:\*\* T-0008/);
});

test("assignIds backfills, never changes existing, is idempotent, commits only touched paths", async () => {
  const { root, tasks, g } = ws(true);
  writeFileSync(join(root, "other.txt"), "x");
  g("add", "other.txt");
  const r = await assignIds(tasks);
  assert.equal(r.assigned.length, 2);
  assert.equal(r.committed, true);
  const b = await loadBoard(tasks);
  const by = Object.fromEntries(b.columns.flatMap((c) => c.tasks).map((t) => [t.id, t.displayId]));
  assert.equal(by["A-two"], "T-0007");
  assert.equal(by["A-one"], "T-0008");
  assert.equal(by["A-three"], "T-0009");
  assert.ok(!g("show", "--name-only", "--format=", "HEAD").includes("other.txt"));
  assert.match(g("status", "--porcelain"), /A\s+other\.txt/);
  const head = g("rev-parse", "HEAD");
  const again = await assignIds(tasks);
  assert.deepEqual(again, { assigned: [], committed: false });
  assert.equal(g("rev-parse", "HEAD"), head);
});

test("assignIds renumbers duplicates (first keeps its ID)", async () => {
  const { tasks } = ws(false);
  writeFileSync(join(tasks, "1-backlog", "A-one.md"), body("A-one", "T-0007"));
  await assignIds(tasks);
  const ts = (await loadBoard(tasks)).columns.flatMap((c) => c.tasks);
  assert.equal(new Set(ts.map((t) => t.displayId)).size, 3);
  assert.equal(ts.find((t) => t.id === "A-one")!.displayId, "T-0007");
  assert.equal(ts.find((t) => t.id === "A-three")!.displayId, "T-0008");
  assert.equal(ts.find((t) => t.id === "A-two")!.displayId, "T-0009");
});

test("assignIds without git writes files, commits nothing", async () => {
  const { tasks } = ws(false);
  const r = await assignIds(tasks);
  assert.equal(r.committed, false);
  assert.equal(r.assigned.length, 2);
});

test("deleteTask tracked: git rm and commit that path only", async () => {
  const { root, tasks, g } = ws(true);
  writeFileSync(join(root, "other.txt"), "x");
  g("add", "other.txt");
  const p = join(tasks, "2-todo", "A-two.md");
  const r = await deleteTask(tasks, p);
  assert.equal(r.committed, true);
  assert.ok(!existsSync(p));
  assert.equal(g("log", "-1", "--format=%s"), "task(A-two): delete");
  assert.ok(!g("show", "--name-only", "--format=", "HEAD").includes("other.txt"));
  assert.match(g("status", "--porcelain"), /A\s+other\.txt/);
});

test("deleteTask tracked with commit:false only unlinks; untracked and non-git unlink", async () => {
  const { root, tasks, g } = ws(true);
  const head = g("rev-parse", "HEAD");
  assert.equal((await deleteTask(tasks, join(tasks, "2-todo", "A-two.md"), { commit: false })).committed, false);
  assert.equal(g("rev-parse", "HEAD"), head);
  writeFileSync(join(tasks, "1-backlog", "Untracked.md"), body("u"));
  assert.equal((await deleteTask(tasks, join(tasks, "1-backlog", "Untracked.md"))).committed, false);
  assert.ok(!existsSync(join(tasks, "1-backlog", "Untracked.md")));
  assert.ok(root);
  const n = ws(false);
  assert.equal((await deleteTask(n.tasks, join(n.tasks, "2-todo", "A-two.md"))).committed, false);
  assert.ok(!existsSync(join(n.tasks, "2-todo", "A-two.md")));
});

test("deleteTask rejects paths outside a column", async () => {
  const { root, tasks } = ws(false);
  writeFileSync(join(root, "secret.md"), "x");
  await assert.rejects(deleteTask(tasks, join(root, "secret.md")));
  await assert.rejects(deleteTask(tasks, join(tasks, "2-todo", "..", "..", "secret.md")));
  await assert.rejects(deleteTask(tasks, join(tasks, "_inbox", "x.md")));
  await assert.rejects(deleteTask(tasks, join(tasks, "2-todo", "A-two.txt")));
});

test("deleteColumn refuses a column with tasks, removes an empty one", async () => {
  const { tasks, g } = ws(true);
  await assert.rejects(deleteColumn(tasks, "2-todo"), /still has 2 tasks/);
  assert.ok(existsSync(join(tasks, "2-todo", "A-two.md")));
  assert.ok(existsSync(join(tasks, "3-done")));
  const r = await deleteColumn(tasks, "3-done");
  assert.equal(r.committed, false); // empty untracked dir: nothing to commit
  assert.ok(!existsSync(join(tasks, "3-done")));
  void g;
});

test("deleteColumn removes a tracked .gitkeep with a commit; refuses other files and bad names", async () => {
  const { tasks, g } = ws(true);
  writeFileSync(join(tasks, "3-done", ".gitkeep"), "");
  g("add", "-A");
  g("commit", "-q", "-m", "keep");
  const r = await deleteColumn(tasks, "3-done");
  assert.equal(r.committed, true);
  assert.ok(!existsSync(join(tasks, "3-done")));
  mkdirSync(join(tasks, "4-x"));
  writeFileSync(join(tasks, "4-x", "notes.txt"), "hi");
  await assert.rejects(deleteColumn(tasks, "4-x"), /contains notes.txt/);
  await assert.rejects(deleteColumn(tasks, "../x"));
  await assert.rejects(deleteColumn(tasks, "_inbox"));
});

function globRepo() {
  const { root, tasks, g } = ws(false);
  for (const n of ["Fix *.md", "Fix a.md", "Fix b.md", "a[12].md", "a1.md", "a2.md"]) writeFileSync(join(tasks, "2-todo", n), body(n.replace(".md", ""), undefined));
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, tasks, g };
}

test("deleteTask with glob characters in the name deletes only that file", async () => {
  const { tasks, g } = globRepo();
  await deleteTask(tasks, join(tasks, "2-todo", "Fix *.md"));
  assert.ok(!existsSync(join(tasks, "2-todo", "Fix *.md")));
  for (const n of ["Fix a.md", "Fix b.md", "a1.md"]) assert.ok(existsSync(join(tasks, "2-todo", n)), n);
  assert.equal(g("show", "--name-status", "--format=", "HEAD"), "D\tTasks/2-todo/Fix *.md");
  await deleteTask(tasks, join(tasks, "2-todo", "a[12].md"));
  assert.ok(existsSync(join(tasks, "2-todo", "a1.md")) && existsSync(join(tasks, "2-todo", "a2.md")));
  assert.equal(g("show", "--name-status", "--format=", "HEAD"), "D\tTasks/2-todo/a[12].md");
});

test("moveTask with glob characters moves and commits only that file", async () => {
  const { tasks, g } = globRepo();
  await moveTask(tasks, join(tasks, "2-todo", "Fix *.md"), "3-done");
  assert.ok(existsSync(join(tasks, "3-done", "Fix *.md")));
  assert.ok(existsSync(join(tasks, "2-todo", "Fix a.md")));
  const files = g("show", "--name-status", "--format=", "HEAD").split("\n");
  assert.equal(files.length, 1);
  assert.match(files[0], /^R\d*\tTasks\/2-todo\/Fix \*\.md\tTasks\/3-done\/Fix \*\.md$/);
});

test("assignIds with glob-named files touches only those files", async () => {
  const { tasks, g } = globRepo();
  const r = await assignIds(tasks);
  assert.equal(r.assigned.length, 8); // 3 from ws (one already has an id) + 6 glob files
  assert.equal(g("status", "--porcelain"), "");
  assert.equal(g("log", "--format=%s", "-1"), "chore(tasks): assign task IDs");
});

test("assignIds skips tracked files with uncommitted edits", async () => {
  const { tasks, g } = ws(true);
  const wip = join(tasks, "1-backlog", "A-one.md");
  writeFileSync(wip, body("A-one") + "\nWIP\n");
  const r = await assignIds(tasks);
  assert.deepEqual(r.assigned.map((a) => a.path), [join(tasks, "2-todo", "A-three.md")]);
  assert.ok(!readFileSync(wip, "utf8").includes("**ID:**"));
  assert.match(g("status", "--porcelain"), /^M Tasks\/1-backlog\/A-one\.md$/);
  g("commit", "-q", "-am", "wip");
  assert.equal((await assignIds(tasks)).assigned.length, 1);
});

test("setIdField leaves a non-T- user ID alone; assignIds does not renumber it", async () => {
  const src = body("a", "JIRA-123");
  assert.equal(setIdField(src, "T-0001"), src);
  const { tasks } = ws(false);
  const f = join(tasks, "1-backlog", "A-one.md");
  writeFileSync(f, src);
  await assignIds(tasks);
  assert.match(readFileSync(f, "utf8"), /ID:\*\* JIRA-123/);
});

test("deleteImpact: recoverable, loses-local-edits, permanent", async () => {
  const { tasks } = ws(true);
  const f = join(tasks, "2-todo", "A-two.md");
  assert.equal(await deleteImpact(f), "recoverable");
  assert.equal(await deleteImpact(f, { commit: false }), "permanent");
  writeFileSync(f, body("A-two", "T-0007") + "edit\n");
  assert.equal(await deleteImpact(f), "loses-local-edits");
  const u = join(tasks, "2-todo", "Untracked.md");
  writeFileSync(u, body("U"));
  assert.equal(await deleteImpact(u), "permanent");
  assert.equal(await deleteImpact(join(ws(false).tasks, "1-backlog", "A-one.md")), "permanent");
});

test("deleteTask commit message with $ and {id} is templated literally", async () => {
  const { tasks, g } = ws(true);
  await deleteTask(tasks, join(tasks, "2-todo", "A-two.md"), { message: "rm {id} $& $1" });
  assert.equal(g("log", "--format=%s", "-1"), "rm A-two $& $1");
});

test("deleteColumn ignores .DS_Store", async () => {
  const { tasks } = ws(false);
  mkdirSync(join(tasks, "4-x"));
  writeFileSync(join(tasks, "4-x", ".DS_Store"), "");
  await deleteColumn(tasks, "4-x");
  assert.ok(!existsSync(join(tasks, "4-x")));
});
