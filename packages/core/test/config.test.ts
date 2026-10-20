import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBoard, parseColors, colorOf, setColumnColor } from "../src/index.ts";

function tasksDir(git = false) {
  const root = mkdtempSync(join(tmpdir(), "gitask-cfg-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  mkdirSync(join(tasks, "2-todo"));
  if (git) {
    const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
    writeFileSync(join(tasks, "gitask.json"), '{"other":1}\n');
    g("add", "-A");
    g("commit", "-q", "-m", "init");
  }
  return { root, tasks };
}

test("parseColors: good, bad and malformed input", () => {
  assert.deepEqual(parseColors('{"columns":{"2-todo":{"color":"#AABBCC"},"1-backlog":{"color":"red"},"x":{"color":"#abc"},"y":5}}'), { "2-todo": "#aabbcc" });
  assert.deepEqual(parseColors("not json"), {});
  assert.deepEqual(parseColors("[]"), {});
  assert.deepEqual(parseColors('{"columns":[]}'), {});
  assert.deepEqual(parseColors(""), {});
});

test("loadBoard: missing file means no colour; present file fills Column.color", async () => {
  const { tasks } = tasksDir();
  assert.equal((await loadBoard(tasks)).columns[0].color, undefined);
  writeFileSync(join(tasks, "gitask.json"), '{"columns":{"2-todo":{"color":"#112233"}}}');
  const b = await loadBoard(tasks);
  assert.equal(b.columns[0].color, undefined);
  assert.equal(b.columns[1].color, "#112233");
  writeFileSync(join(tasks, "gitask.json"), "{broken");
  assert.equal((await loadBoard(tasks)).columns[1].color, undefined);
});

test("setColumnColor keeps other keys, resets, and rejects bad colours", async () => {
  const { tasks } = tasksDir();
  writeFileSync(join(tasks, "gitask.json"), '{"other":1,"columns":{"2-todo":{"color":"#000000","hidden":true}}}');
  await setColumnColor(tasks, "1-backlog", "#FF0000");
  let j = JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8"));
  assert.equal(j.other, 1);
  assert.equal(j.columns["1-backlog"].color, "#ff0000");
  assert.equal(j.columns["2-todo"].hidden, true);
  await setColumnColor(tasks, "2-todo", null);
  j = JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8"));
  assert.deepEqual(j.columns["2-todo"], { hidden: true });
  await setColumnColor(tasks, "1-backlog", null);
  j = JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8"));
  assert.equal(j.columns["1-backlog"], undefined);
  await assert.rejects(setColumnColor(tasks, "2-todo", "red"));
  await assert.rejects(setColumnColor(tasks, "2-todo", "#12345"));
});

test("setColumnColor creates the file; refuses to overwrite an unreadable one", async () => {
  const { tasks } = tasksDir();
  const r = await setColumnColor(tasks, "2-todo", "#00ff00");
  assert.equal(r.committed, false);
  assert.equal(JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8")).columns["2-todo"].color, "#00ff00");
  writeFileSync(join(tasks, "gitask.json"), "{broken");
  await assert.rejects(setColumnColor(tasks, "2-todo", "#00ff00"));
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), "{broken");
});

test("setColumnColor commits the tracked file only", async () => {
  const { root, tasks } = tasksDir(true);
  writeFileSync(join(root, "dirty.txt"), "x");
  execFileSync("git", ["add", "dirty.txt"], { cwd: root });
  const r = await setColumnColor(tasks, "2-todo", "#123456");
  assert.equal(r.committed, true);
  const files = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: root }).toString();
  assert.equal(files.trim(), "Tasks/gitask.json");
  const none = await setColumnColor(tasks, "2-todo", "#654321", { commit: false });
  assert.equal(none.committed, false);
});

test("colours: prototype-named status folders never get an inherited value", async () => {
  const { tasks } = tasksDir();
  for (const name of ["3-constructor", "4-toString", "5-__proto__"]) mkdirSync(join(tasks, name));
  writeFileSync(join(tasks, "gitask.json"), '{"columns":{"__proto__":{"color":"#112233"},"2-todo":{"color":"#aabbcc"}}}');
  const board = await loadBoard(tasks);
  const by = Object.fromEntries(board.columns.map((c) => [c.id, c.color]));
  assert.equal(by["2-todo"], "#aabbcc");
  assert.equal(by["3-constructor"], undefined);
  for (const c of board.columns) assert.ok(c.color === undefined || /^#[0-9a-f]{6}$/.test(c.color));
  // Bare names, as a hand-edited config or a looser folder rule could produce them.
  const colors = parseColors('{"columns":{"__proto__":{"color":"#112233"}}}');
  for (const id of ["constructor", "toString", "hasOwnProperty", "valueOf"]) assert.equal(colorOf(colors, id), undefined);
  assert.equal(colorOf(colors, "__proto__"), "#112233");
  assert.equal(colorOf({}, "__proto__"), undefined);
});

test("setColumnColor: a column named __proto__ is stored as plain data", async () => {
  const { tasks } = tasksDir();
  await setColumnColor(tasks, "__proto__", "#112233", { commit: false });
  const text = readFileSync(join(tasks, "gitask.json"), "utf8");
  assert.deepEqual(Object.keys(JSON.parse(text).columns), ["__proto__"]);
  assert.equal(Object.getPrototypeOf(JSON.parse(text).columns), Object.prototype);
  assert.equal(parseColors(text)["2-todo"], undefined);
});
