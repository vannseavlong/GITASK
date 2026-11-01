import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { findTasksDir } from "../src/find-tasks.ts";

const tmp = () => realpathSync(mkdtempSync(join(tmpdir(), "gitask-find-")));

/** True when some ancestor of `dir` has a `.git` (e.g. a stray `/tmp/.git`), so "outside a git repo" cannot be built there. */
function insideGitRepo(dir: string): boolean {
  for (let cur = dirname(dir); ; cur = dirname(cur)) {
    if (existsSync(join(cur, ".git"))) return true;
    if (dirname(cur) === cur) return false;
  }
}

test("finds Tasks in the folder itself and in a parent inside the git root", () => {
  const root = tmp();
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, "Tasks"));
  mkdirSync(join(root, "a", "b"), { recursive: true });
  assert.equal(findTasksDir(root), join(root, "Tasks"));
  assert.equal(findTasksDir(join(root, "a", "b")), join(root, "Tasks"));
});

test("never walks above the git root", () => {
  const outer = tmp();
  mkdirSync(join(outer, "Tasks")); // unrelated folder above the project
  const proj = join(outer, "proj");
  mkdirSync(join(proj, ".git"), { recursive: true });
  mkdirSync(join(proj, "sub"));
  assert.equal(findTasksDir(join(proj, "sub")), undefined);
});

test("outside a git repo only the current folder is checked", (t) => {
  const outer = tmp();
  if (insideGitRepo(outer)) return t.skip(`a parent of ${outer} holds a .git, so there is no git-free place to test`);
  mkdirSync(join(outer, "Tasks"));
  mkdirSync(join(outer, "child"));
  assert.equal(findTasksDir(join(outer, "child")), undefined);
  assert.equal(findTasksDir(outer), join(outer, "Tasks"));
});

test("matches the name case-exactly and ignores a symlinked Tasks", () => {
  const root = tmp();
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, "tasks")); // lower-case: on macOS a plain stat would match `Tasks`
  assert.equal(findTasksDir(root), undefined);
  const other = tmp();
  mkdirSync(join(other, "real"));
  symlinkSync(join(other, "real"), join(other, "Tasks"));
  mkdirSync(join(other, ".git"));
  assert.equal(findTasksDir(other), undefined);
});
