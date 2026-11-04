import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addColumn, chooseStatusNumber, loadBoard, validateMessage, validateStatusName, STATUS_FOLDERS, MAX_STATUS_NAME } from "../src/index.ts";

function ws(git: boolean, dirs: readonly string[] = STATUS_FOLDERS) {
  const root = mkdtempSync(join(tmpdir(), "gitask-addcol-"));
  const tasks = join(root, "Tasks");
  for (const d of dirs) { mkdirSync(join(tasks, d), { recursive: true }); writeFileSync(join(tasks, d, ".gitkeep"), ""); }
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

test("validateStatusName: accepts safe names and makes a slug", () => {
  assert.deepEqual(validateStatusName("Code Review"), { ok: true, slug: "code-review" });
  assert.deepEqual(validateStatusName("  QA - 2 "), { ok: true, slug: "qa-2" });
});

test("validateStatusName: refuses hostile, hidden, reserved, long, duplicate names", () => {
  const bad = ["", "   ", "..", "../x", "a/b", "a\\b", "_hidden", ".hidden", "-x", "café", "日本", "a\0b", "a:b", "con", "NUL", "COM1", "x".repeat(MAX_STATUS_NAME + 1), "- -"];
  for (const n of bad) assert.equal(validateStatusName(n).ok, false, JSON.stringify(n));
  assert.equal(validateStatusName(undefined).ok, false);
  assert.equal(validateStatusName(7).ok, false);
  assert.equal(validateStatusName("x".repeat(MAX_STATUS_NAME)).ok, true);
  const dup = validateStatusName("DONE", ["5-done"]);
  assert.equal(dup.ok, false);
  assert.equal(validateStatusName("In  Progress", ["3-in-progress"]).ok, false);
});

test("chooseStatusNumber: append, gaps, many columns, after", () => {
  assert.equal(chooseStatusNumber([]), 1);
  assert.equal(chooseStatusNumber([...STATUS_FOLDERS]), 7);
  assert.equal(chooseStatusNumber(["1-a", "2-b", "5-c"]), 6, "append goes after the highest, never fills a gap");
  const many = Array.from({ length: 12 }, (_, i) => `${i + 1}-s${i}`);
  assert.equal(chooseStatusNumber(many), 13);
  assert.equal(chooseStatusNumber(["1-a", "2-b", "5-c"], "2-b"), 3, "free number after");
  assert.throws(() => chooseStatusNumber([...STATUS_FOLDERS], "2-todo"), /no free number/);
  assert.throws(() => chooseStatusNumber([...STATUS_FOLDERS], "9-nope"), /Unknown/);
  assert.throws(() => chooseStatusNumber(["999-x"]), /Too many/);
});

test("addColumn creates 7-review after 6-deploy, shows on the board, commits only its placeholder", async () => {
  const { root, tasks, g } = ws(true);
  writeFileSync(join(root, "unrelated.txt"), "dirty");
  g("add", "unrelated.txt"); // staged by someone else: must stay out of our commit
  const r = await addColumn(tasks, "Review");
  assert.equal(r.id, "7-review");
  assert.equal(r.committed, true);
  assert.ok(existsSync(join(tasks, "7-review", ".gitkeep")));
  assert.deepEqual((await loadBoard(tasks)).columns.map((c) => c.id).at(-1), "7-review");
  assert.deepEqual(g("show", "--name-only", "--format=%s", "HEAD").split("\n"), ["status(7-review): add", "", "Tasks/7-review/.gitkeep"]);
  assert.match(g("status", "--porcelain"), /^A\s+unrelated\.txt$/m);
});

test("addColumn: a fresh clone still shows the new column", async () => {
  const { root, tasks } = ws(true);
  await addColumn(tasks, "Review");
  const clone = mkdtempSync(join(tmpdir(), "gitask-addcol-clone-"));
  execFileSync("git", ["clone", "-q", root, join(clone, "c")], { stdio: "pipe" });
  const ids = (await loadBoard(join(clone, "c", "Tasks"))).columns.map((c) => c.id);
  assert.deepEqual(ids, [...STATUS_FOLDERS, "7-review"]);
});

test("addColumn: commit off, no repo, and colour", async () => {
  const off = ws(true);
  const before = off.g("rev-parse", "HEAD");
  const r = await addColumn(off.tasks, "Review", { commit: false });
  assert.equal(r.committed, false);
  assert.equal(off.g("rev-parse", "HEAD"), before);

  const plain = ws(false);
  assert.equal((await addColumn(plain.tasks, "Review")).committed, false);

  const col = ws(true);
  writeFileSync(join(col.tasks, "gitask.json"), "{}\n");
  col.g("add", "-A");
  col.g("commit", "-q", "-m", "cfg");
  await addColumn(col.tasks, "Review", { color: "#AABBCC" });
  const board = await loadBoard(col.tasks);
  assert.equal(board.columns.at(-1)?.color, "#aabbcc");
  assert.equal(col.g("status", "--porcelain"), "");
  await assert.rejects(() => addColumn(col.tasks, "Other", { color: "red" }), /colour/);
  assert.ok(!existsSync(join(col.tasks, "8-other")), "a bad colour creates nothing");
});

test("addColumn: after uses a free number and never renames; refuses when no gap", async () => {
  const { tasks } = ws(false, ["1-a", "2-b", "5-c"]);
  assert.equal((await addColumn(tasks, "mid", { after: "2-b" })).id, "3-mid");
  assert.deepEqual(readdirSync(tasks).sort(), ["1-a", "2-b", "3-mid", "5-c"]);
  await assert.rejects(() => addColumn(tasks, "again", { after: "2-b" }), /no free number/);
});

test("addColumn: refuses duplicates and traversal, creates nothing outside Tasks", async () => {
  const { root, tasks } = ws(false);
  await assert.rejects(() => addColumn(tasks, "Done"), /already exists/);
  await assert.rejects(() => addColumn(tasks, "dEpLoY"), /already exists/);
  for (const n of ["../evil", "..", "a/b", "_inbox", ".git", ""]) await assert.rejects(() => addColumn(tasks, n), () => true, n);
  assert.deepEqual(readdirSync(tasks).sort(), [...STATUS_FOLDERS]);
  assert.deepEqual(readdirSync(root), ["Tasks"]);
});

test("validateMessage addColumn: shared rules, unknown after, bad colour", () => {
  const ctx = { tasksDir: "/t", columns: [...STATUS_FOLDERS], views: [] };
  const ok = validateMessage({ type: "addColumn", name: " Review ", after: "2-todo", color: "#112233" }, ctx);
  assert.deepEqual(ok, { ok: true, message: { type: "addColumn", name: "Review", after: "2-todo", color: "#112233" } });
  for (const m of [
    { type: "addColumn", name: "../x" }, { type: "addColumn", name: "done" }, { type: "addColumn" }, { type: "addColumn", name: 5 },
    { type: "addColumn", name: "ok", after: "9-x" }, { type: "addColumn", name: "ok", color: "blue" }, { type: "addColumn", name: "ok", after: {} },
  ]) assert.equal(validateMessage(m, ctx).ok, false, JSON.stringify(m));
});
