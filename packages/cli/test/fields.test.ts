import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const MAIN = resolve(import.meta.dirname, "../src/main.ts");
const CONFIG = { fields: [
  { key: "platform", label: "Platform", multi: true, values: [{ id: "admin-portal", label: "Admin Portal" }, { id: "app", label: "App" }, { id: "landing-page", label: "Landing Page" }] },
  { key: "env", label: "Env", values: [{ id: "prod", label: "Prod" }, { id: "dev", label: "Dev" }] },
] };

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-clifields-"));
  const tasks = join(root, "Tasks");
  for (const c of ["2-todo", "5-done"]) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify(CONFIG));
  writeFileSync(join(tasks, "2-todo", "A-one.md"), "# One\n\n- **Owner:** Sam\n- **Platform:** app\n- **Updated:** 2026-10-05\n\n## Sub-tasks\n- [ ] first #platform:landing-page\n- [ ] second\n");
  writeFileSync(join(tasks, "2-todo", "A-two.md"), "# Two\n\n- **Owner:** Sam\n- **Env:** prod\n\n## Sub-tasks\n- [ ] only\n");
  writeFileSync(join(tasks, "5-done", "A-done.md"), "# Done\n\n- **Owner:** Sam\n- **Platform:** admin-portal\n- **Started / updated:** 2026-10-02 / 2026-10-05\n");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks"); g("commit", "-q", "-m", "init");
  return { root, tasks, g, one: join(tasks, "2-todo", "A-one.md") };
}

const cli = (root: string, ...args: string[]) => {
  const r = spawnSync(process.execPath, [MAIN, ...args], { cwd: root, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

test("fields lists the configured fields and values", () => {
  const { root } = repo();
  const r = cli(root, "fields");
  assert.equal(r.code, 0);
  assert.match(r.out, /platform {2}Platform {2}\(several values allowed\)\n {4}admin-portal, app, landing-page/);
  assert.match(r.out, /env {2}Env\n {4}prod, dev/);
});

test("board --field keeps tasks by their own value or a sub-task value; fields combine with AND", () => {
  const { root } = repo();
  const ids = (out: string) => [...out.matchAll(/\b(A-[a-z]+)\b/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids(cli(root, "board", "--field", "platform=app").out), ["A-one"]);
  assert.deepEqual(ids(cli(root, "board", "--field", "platform=landing-page").out), ["A-one"]); // through its sub-task
  assert.deepEqual(ids(cli(root, "board", "--field", "platform=app,admin-portal").out), ["A-done", "A-one"]);
  assert.deepEqual(ids(cli(root, "board", "--field", "platform=app", "--field", "env=prod").out), []);
  assert.deepEqual(ids(cli(root, "board", "--field", "env=prod").out), ["A-two"]);
  assert.deepEqual(ids(cli(root, "board").out), ["A-done", "A-one", "A-two"]);
});

test("unknown field or value is refused with the allowed list, nothing is read as a filter", () => {
  const { root } = repo();
  const bad = cli(root, "board", "--field", "colour=red");
  assert.equal(bad.code, 1);
  assert.match(bad.err, /Unknown field "colour"\. Fields in gitask\.json: platform, env/);
  const val = cli(root, "board", "--field", "platform=web");
  assert.equal(val.code, 1);
  assert.match(val.err, /"web" is not a Platform value\. Allowed: admin-portal, app, landing-page/);
  for (const f of ["platform", "=app", "platform="]) assert.equal(cli(root, "board", "--field", f).code, 1, f);
  assert.equal(cli(root, "board", "--field").code, 1);
});

test("field set writes the header line and commits that file only; none clears", () => {
  const { root, g, one } = repo();
  const r = cli(root, "field", "set", "A-one", "platform", "admin-portal,app");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /A-one: platform admin-portal, app \(committed\)/);
  assert.match(readFileSync(one, "utf8"), /- \*\*Platform:\*\* admin-portal, app\n/);
  assert.equal(g("show", "--stat", "--format=", "HEAD").split("\n").filter(Boolean).length, 2); // the file line and the summary
  assert.equal(g("status", "--porcelain"), "");
  assert.equal(cli(root, "field", "set", "A-one", "env", "prod,dev").code, 1); // env takes one value
  assert.equal(cli(root, "field", "set", "A-one", "platform", "nope").code, 1);
  assert.equal(cli(root, "field", "set", "A-one", "platform", "none").code, 0);
  assert.match(cli(root, "field", "set", "A-one").err, /usage: gitask field set/);
  assert.equal(g("status", "--porcelain"), "");
});

test("subtask field and subtask add --field write #key:id tokens; list shows them", () => {
  const { root, one } = repo();
  assert.equal(cli(root, "subtask", "field", "A-one", "1", "platform", "app").code, 0);
  assert.match(readFileSync(one, "utf8"), /- \[ \] second #platform:app\n/);
  assert.equal(cli(root, "subtask", "add", "A-one", "third", "--field", "platform=admin-portal", "--field", "env=dev").code, 0);
  assert.match(readFileSync(one, "utf8"), /- \[ \] third #platform:admin-portal #env:dev\n/);
  const list = cli(root, "subtask", "list", "A-one").out;
  assert.match(list, /^0 {2}\[ \] first #platform:landing-page/m);
  assert.match(list, /^1 {2}\[ \] second #platform:app/m);
  assert.equal(cli(root, "subtask", "field", "A-one", "9", "platform", "app").code, 1);
  assert.equal(cli(root, "subtask", "field", "A-one", "x", "platform", "app").code, 1);
  assert.equal(cli(root, "subtask", "add", "A-one", "bad", "--field", "platform=nope").code, 1);
});

test("report --field keeps only matching done tasks", () => {
  const { root } = repo();
  const all = cli(root, "report", "--format", "csv", "--date", "updated");
  assert.equal(all.code, 0, all.err);
  assert.match(all.out, /A-done|Done/);
  const none = cli(root, "report", "--format", "csv", "--date", "updated", "--field", "platform=app");
  assert.equal(none.code, 0, none.err);
  assert.doesNotMatch(none.out, /Done/);
  const some = cli(root, "report", "--format", "csv", "--date", "updated", "--field", "platform=admin-portal");
  assert.match(some.out, /Done/);
});

test("without a fields block the commands say so", () => {
  const { root, tasks } = repo();
  writeFileSync(join(tasks, "gitask.json"), "{}");
  assert.match(cli(root, "fields").out, /No fields defined/);
  assert.match(cli(root, "board", "--field", "platform=app").err, /No fields are defined/);
});
