import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const MAIN = resolve(import.meta.dirname, "../src/main.ts");

const task = (owner: string, subs = "", title = "X") =>
  `# ${title}\n\n- **Owner:** ${owner}\n- **Started / updated:** 2026-10-02 / 2026-10-05\n- **Due:** 2026-10-10\n\n## Goal\nx\n\n## Done when\n- [ ] a\n${subs}`;

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-cli-"));
  for (const c of ["2-todo", "5-done"]) mkdirSync(join(root, "Tasks", c), { recursive: true });
  writeFileSync(join(root, "Tasks", "2-todo", "A-one.md"), task("Sam Lee", "\n## Sub-tasks\n- [ ] first\n"));
  writeFileSync(join(root, "Tasks", "5-done", "A-done.md"), task("Ann Roe", "", "Done thing"));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "--", "Tasks");
  g("-c", "user.name=Sam Lee", "-c", "user.email=1+samlee@users.noreply.github.com", "commit", "-q", "-m", "init");
  writeFileSync(join(root, "b"), "b");
  g("add", "--", "b");
  g("-c", "user.name=Ann Roe", "-c", "user.email=ann@x.io", "commit", "-q", "-m", "b");
  return { root, g };
}

const cli = (root: string, ...args: string[]) => {
  const r = spawnSync(process.execPath, [MAIN, ...args], { cwd: root, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

test("people lists contributors, --json has github login and no emails", () => {
  const { root } = repo();
  const plain = cli(root, "people");
  assert.equal(plain.code, 0);
  assert.match(plain.out, /sam-lee {2}Sam Lee {2}@samlee/);
  const j = JSON.parse(cli(root, "people", "--json").out);
  assert.deepEqual(j.map((p: { id: string }) => p.id).sort(), ["ann-roe", "sam-lee"]);
  assert.ok(!JSON.stringify(j).includes("@x.io"));
});

test("assign sets, clears and rejects unknowns", () => {
  const { root, g } = repo();
  const ok = cli(root, "assign", "A-one", "ann-roe");
  assert.equal(ok.code, 0, ok.err);
  assert.match(readFileSync(join(root, "Tasks/2-todo/A-one.md"), "utf8"), /\*\*Owner:\*\* Ann Roe/);
  assert.match(g("log", "-1", "--format=%s"), /owner Ann Roe/);
  assert.equal(cli(root, "assign", "A-one", "none").code, 0);
  assert.match(readFileSync(join(root, "Tasks/2-todo/A-one.md"), "utf8"), /\*\*Owner:\*\*\s*\n/);
  const bad = cli(root, "assign", "A-one", "nobody");
  assert.notEqual(bad.code, 0);
  assert.match(bad.err, /Unknown person "nobody"/);
  const noTask = cli(root, "assign", "Nope", "ann-roe");
  assert.notEqual(noTask.code, 0);
  assert.match(noTask.err, /Task not found/);
});

test("subtask add and assign", () => {
  const { root } = repo();
  const f = join(root, "Tasks/2-todo/A-one.md");
  const add = cli(root, "subtask", "add", "A-one", "write docs", "--assign", "sam-lee", "--lane", "dev");
  assert.equal(add.code, 0, add.err);
  assert.match(readFileSync(f, "utf8"), /- \[ \] write docs @sam-lee #dev/);
  assert.match(cli(root, "subtask", "list", "A-one").out, /^1 {2}\[ \] first/m);
  const as = cli(root, "subtask", "assign", "A-one", "1", "ann-roe");
  assert.equal(as.code, 0, as.err);
  assert.match(readFileSync(f, "utf8"), /- \[ \] first @ann-roe/);
  assert.equal(cli(root, "subtask", "assign", "A-one", "1", "none").code, 0);
  assert.doesNotMatch(readFileSync(f, "utf8"), /first @/);
  assert.match(cli(root, "subtask", "assign", "A-one", "9", "ann-roe").err, /Invalid sub-task index/);
  assert.match(cli(root, "subtask", "add", "A-one", "x", "--assign", "ghost").err, /Unknown person/);
  assert.notEqual(cli(root, "subtask", "add", "A-one", "x", "--lane", "1bad").code, 0);
});

test("report formats, filters and validation", () => {
  const { root } = repo();
  const md = cli(root, "report", "--from", "2026-10-01", "--format", "md");
  assert.equal(md.code, 0, md.err);
  assert.match(md.out, /Done thing/);
  assert.match(cli(root, "report", "--format", "csv", "--people", "ann-roe").out, /^"person","kind","task_id"/);
  assert.match(cli(root, "report", "--format", "html", "--no-subtasks").out, /<html/i);
  const none = cli(root, "report", "--format", "md", "--people", "sam-lee");
  assert.doesNotMatch(none.out, /Done thing/);
  const out = join(root, "out", "r.html");
  const w = cli(root, "report", "--format", "html", "--out", out);
  assert.equal(w.code, 0, w.err);
  assert.match(readFileSync(out, "utf8"), /Done thing/);
  assert.match(cli(root, "report", "--format", "md", "--from", "2026-13-40").err, /Invalid --from/);
  assert.match(cli(root, "report", "--format", "md", "--from", "2026-10-09", "--to", "2026-10-01").err, /after --to/);
  assert.match(cli(root, "report", "--format", "pdf").err, /--format is required/);
  assert.match(cli(root, "report", "--format", "md", "--people", "ghost").err, /Unknown person/);
  assert.match(cli(root, "report", "--format", "md", "--date", "never").err, /Invalid --date/);
});

test("github: no config means no call; plan is a dry run; sync needs --yes and a token", () => {
  const { root } = repo();
  const none = cli(root, "github", "plan");
  assert.equal(none.code, 1);
  assert.match(none.err, /No GitHub link/);
  writeFileSync(join(root, "Tasks", "gitask.json"), JSON.stringify({ github: { repo: "acme/app" } }));
  const before = readFileSync(join(root, "Tasks/2-todo/A-one.md"), "utf8");
  const plan = cli(root, "github", "plan");
  assert.equal(plan.code, 0, plan.err);
  assert.match(plan.out, /create {2}A-one/);
  assert.match(plan.out, /@samlee/);
  assert.match(plan.out, /Dry run: nothing was sent/);
  const noYes = cli(root, "github", "sync");
  assert.equal(noYes.code, 1);
  assert.match(noYes.err, /--yes/);
  const run = (...a: string[]) => spawnSync(process.execPath, [MAIN, "github", "sync", "--yes", ...a], { cwd: root, encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: "" } });
  // the repo in gitask.json is not the origin remote (there is none): a second acknowledgement is required
  assert.match(plan.out, /WARNING: .*acme\/app/);
  const noAllow = run();
  assert.equal(noAllow.status, 1);
  assert.match(noAllow.stderr, /--allow-repo acme\/app/);
  assert.equal(run("--allow-repo", "other/repo").status, 1);
  assert.match(run("--allow-repo", "other/repo").stderr, /--allow-repo acme\/app/);
  const r = run("--allow-repo", "acme/app");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /GITHUB_TOKEN/);
  // origin == configured repo: no warning and no --allow-repo needed
  execFileSync("git", ["remote", "add", "origin", "https://github.com/acme/app.git"], { cwd: root });
  assert.doesNotMatch(cli(root, "github", "plan").out, /WARNING/);
  assert.match(run().stderr, /GITHUB_TOKEN/);
  assert.equal(readFileSync(join(root, "Tasks/2-todo/A-one.md"), "utf8"), before);
});

test("serve-style commands find Tasks/ from a subfolder, and fail with a fix when there is none", () => {
  const { root } = repo();
  mkdirSync(join(root, "deep", "er"), { recursive: true });
  const up = cli(join(root, "deep", "er"), "board");
  assert.equal(up.code, 0);
  assert.match(up.out, /A-one/);
  const empty = mkdtempSync(join(tmpdir(), "gitask-none-"));
  const none = cli(empty, "board");
  assert.equal(none.code, 1);
  assert.match(none.err, /No Tasks\/ folder found/);
  assert.match(none.err, /gitask-cli init/);
});

test("init scaffolds Tasks/ in the current folder and is idempotent", () => {
  const empty = mkdtempSync(join(tmpdir(), "gitask-init-"));
  const first = cli(empty, "init");
  assert.equal(first.code, 0);
  assert.match(readFileSync(join(empty, "Tasks", "_TEMPLATE.md"), "utf8"), /Done when/);
  assert.equal(cli(empty, "board").code, 0);
  assert.match(cli(empty, "init").out, /already set up/);
});
