import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBoard } from "gitask-core";
import { handleAddPerson, handleSetOwner } from "../src/owner.ts";
import { validateMessage } from "../src/protocol.ts";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-owner-"));
  const dir = join(root, "Tasks");
  mkdirSync(join(dir, "2-todo"), { recursive: true });
  writeFileSync(join(dir, "2-todo", "A-one.md"), "# A-one\n\n- **Owner:** Sam\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Done when\n- [ ] a\n");
  writeFileSync(join(dir, "gitask.json"), JSON.stringify({ people: [{ id: "ann-roe", name: "Ann Roe" }] }));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, dir, g, path: join(dir, "2-todo", "A-one.md") };
}
const ctx = (dir: string) => ({ tasksDir: dir, columns: ["2-todo"], views: ["board"] });

test("setOwner validation: path inside Tasks, person null or a slug", () => {
  const dir = "/r/Tasks";
  const p = "/r/Tasks/2-todo/A.md";
  assert.deepEqual(validateMessage({ type: "setOwner", path: p, person: "ann-roe" }, ctx(dir)), { ok: true, message: { type: "setOwner", path: p, person: "ann-roe" } });
  assert.deepEqual(validateMessage({ type: "setOwner", path: p, person: null }, ctx(dir)), { ok: true, message: { type: "setOwner", path: p, person: null } });
  for (const bad of ["/etc/passwd", "../x.md", "/r/Tasks/9-nope/A.md", "/r/Tasks/2-todo/../../x.md", 5, undefined]) {
    assert.equal(validateMessage({ type: "setOwner", path: bad, person: null }, ctx(dir)).ok, false, String(bad));
  }
  for (const bad of ["", "Ann Roe", "ann/roe", "-x", "x-", "a--b", "a".repeat(65), 7, undefined, {}]) {
    assert.equal(validateMessage({ type: "setOwner", path: p, person: bad }, ctx(dir)).ok, false, String(bad));
  }
});

test("addPerson validation", () => {
  const dir = "/r/Tasks";
  const p = "/r/Tasks/2-todo/A.md";
  assert.deepEqual(validateMessage({ type: "addPerson", name: "  Sam   Lee " }, ctx(dir)), { ok: true, message: { type: "addPerson", name: "Sam Lee" } });
  assert.equal(validateMessage({ type: "addPerson", name: "Sam", path: p }, ctx(dir)).ok, true);
  assert.equal(validateMessage({ type: "addPerson", name: "Sam", path: "/etc/x.md" }, ctx(dir)).ok, false);
  for (const bad of ["", "   ", "a\u0000b", "x".repeat(65), 3, undefined]) assert.equal(validateMessage({ type: "addPerson", name: bad }, ctx(dir)).ok, false, String(bad));
});

test("handler: assigns a known person, commits only the task, unassigns with null", async () => {
  const { dir, root, g, path } = repo();
  writeFileSync(join(root, "stray.txt"), "untracked");
  await handleSetOwner(dir, await loadBoard(dir), { type: "setOwner", path, person: "ann-roe" });
  assert.match(readFileSync(path, "utf8"), /\*\*Owner:\*\* Ann Roe/);
  assert.deepEqual(g("show", "--name-only", "--format=", "HEAD").split("\n"), ["Tasks/2-todo/A-one.md"]);
  await handleSetOwner(dir, await loadBoard(dir), { type: "setOwner", path, person: null });
  assert.match(readFileSync(path, "utf8"), /\*\*Owner:\*\*\s*\n/);
});

test("handler: unknown person and unknown task are refused, nothing changes", async () => {
  const { dir, g, path } = repo();
  const before = g("rev-parse", "HEAD");
  await assert.rejects(() => handleSetOwner(dir, undefined as never, { type: "setOwner", path, person: "ann-roe" }));
  const board = await loadBoard(dir);
  await assert.rejects(() => handleSetOwner(dir, board, { type: "setOwner", path, person: "ghost" }), /unknown person/);
  await assert.rejects(() => handleSetOwner(dir, board, { type: "setOwner", path: path + "x", person: null }), /task not found/);
  assert.equal(g("rev-parse", "HEAD"), before);
  assert.match(readFileSync(path, "utf8"), /\*\*Owner:\*\* Sam/);
});

test("handler: addPerson with a path adds the person and assigns the task", async () => {
  const { dir, path } = repo();
  await handleAddPerson(dir, await loadBoard(dir), { type: "addPerson", name: "Zoe Kim", path });
  assert.match(readFileSync(path, "utf8"), /\*\*Owner:\*\* Zoe Kim/);
  assert.ok(JSON.parse(readFileSync(join(dir, "gitask.json"), "utf8")).people.some((p: { id: string }) => p.id === "zoe-kim"));
});
