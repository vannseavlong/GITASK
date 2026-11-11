import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const MAIN = resolve(import.meta.dirname, "../src/main.ts");
const COLUMNS = ["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done", "6-deploy"];
const TASK = (id: string, title: string, extra = "") =>
  `# ${title}\n\n- **ID:** ${id}\n- **Owner:** Sam\n- **Claimed by:** none\n- **Started / updated:** 2026-11-01 / 2026-11-01\n${extra}\n## Goal\nSECRET-BODY\n`;

function repo(config: unknown = { sprint: {} }) {
  const root = mkdtempSync(join(tmpdir(), "gitask-cli-sprint-"));
  const tasks = join(root, "Tasks");
  for (const c of COLUMNS) mkdirSync(join(tasks, c), { recursive: true });
  if (config) writeFileSync(join(tasks, "gitask.json"), JSON.stringify(config));
  writeFileSync(join(tasks, "2-todo", "Core-a.md"), TASK("T-0001", "Alpha"));
  writeFileSync(join(tasks, "3-in-progress", "Core-b.md"), TASK("T-0002", "Beta"));
  writeFileSync(join(tasks, "2-todo", "Core-c.md"), TASK("T-0003", "Gamma"));
  writeFileSync(join(tasks, "2-todo", "Core-d.md"), TASK("T-0004", "Delta"));
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt");
  g("commit", "-q", "-m", "init");
  writeFileSync(join(root, "other.txt"), "dirty"); // must never be committed
  const read = (p: string) => readFileSync(join(tasks, p), "utf8");
  const cli = (...args: string[]) => {
    const r = spawnSync(process.execPath, [MAIN, ...args], { cwd: root, encoding: "utf8" });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
  return { root, tasks, g, read, cli, subject: () => g("log", "-1", "--format=%s") };
}

test("sprint new, list, start, add, remove and estimate commit by pathspec", () => {
  const w = repo();
  const empty = w.cli("sprint", "list");
  assert.equal(empty.code, 0, empty.err);
  assert.match(empty.out, /No sprints yet/);

  const made = w.cli("sprint", "new", "--name", "First", "--goal", "Ship it", "--start", "2026-11-16", "--capacity", "20");
  assert.equal(made.code, 0, made.err);
  assert.match(made.out, /created S1: First \(planned, 2026-11-16 → 2026-11-29\) \(committed\)/);
  assert.equal(w.subject(), "sprint(S1): create");

  assert.equal(w.cli("sprint", "add", "Core-a").code, 0); // default: newest planned
  assert.match(w.read("2-todo/Core-a.md"), /- \*\*Sprint:\*\* S1/);
  assert.equal(w.subject(), "task(Core-a): sprint S1");
  const byDisplay = w.cli("sprint", "add", "T-0002", "s1");
  assert.equal(byDisplay.code, 0, byDisplay.err);
  assert.match(byDisplay.out, /Core-b: sprint S1/);
  assert.equal(w.cli("sprint", "add", "Core-c", "S1").code, 0);

  const est = w.cli("estimate", "Core-a", "3");
  assert.equal(est.code, 0, est.err);
  assert.match(w.read("2-todo/Core-a.md"), /- \*\*Estimate:\*\* 3/);
  assert.equal(w.subject(), "task(Core-a): estimate 3");
  assert.equal(w.cli("estimate", "Core-b", "2.5").code, 0);
  assert.equal(w.cli("estimate", "Core-c", "none").code, 0);
  assert.match(w.cli("estimate", "Core-c", "none").out, /already \(none\)/);

  const rm = w.cli("sprint", "remove", "Core-c");
  assert.equal(rm.code, 0, rm.err);
  assert.doesNotMatch(w.read("2-todo/Core-c.md"), /Sprint:/);
  assert.equal(w.subject(), "task(Core-c): sprint none");
  assert.match(w.cli("sprint", "remove", "Core-c").out, /not in a sprint/);

  const start = w.cli("sprint", "start", "S1");
  assert.equal(start.code, 0, start.err);
  assert.match(start.out, /S1: started \(2026-11-16 → 2026-11-29\) \(committed\)/);
  assert.equal(w.subject(), "sprint(S1): start");

  const list = w.cli("sprint", "list");
  assert.match(list.out, /^\* S1 {2}active {3}First {2}2026-11-16 → 2026-11-29 {2}0\/2 tasks {2}0\/5\.5 \(capacity 20\) pts {2}goal: Ship it$/m);
  const j = JSON.parse(w.cli("sprint", "list", "--json").out);
  assert.equal(j.active, "S1");
  assert.deepEqual(j.sprints[0], { id: "S1", name: "First", state: "active", start: "2026-11-16", end: "2026-11-29", goal: "Ship it", capacity: 20, total: 2, done: 0, points: 5.5, donePoints: 0 });
  assert.ok(!JSON.stringify(j).includes(w.root), "no absolute paths in --json");

  // The unrelated dirty file was never committed.
  assert.equal(w.g("show", "HEAD:other.txt"), "x");
});

test("board --sprint keeps one sprint, the active one, or the backlog", () => {
  const w = repo();
  w.cli("sprint", "new");
  w.cli("sprint", "add", "Core-a");
  w.cli("estimate", "Core-a", "5");
  w.cli("sprint", "start", "S1");
  const s = w.cli("board", "--sprint", "active");
  assert.equal(s.code, 0, s.err);
  assert.match(s.out, /^S1 · Sprint 1 \(active, .*\) · 0\/1 tasks · 0\/5 pts$/m);
  assert.match(s.out, /Core-a {2}\(5\)/);
  assert.doesNotMatch(s.out, /Core-b|Core-c/);
  const b = w.cli("board", "--sprint", "backlog");
  assert.match(b.out, /Core-b/);
  assert.doesNotMatch(b.out, /Core-a/);
  const bad = w.cli("board", "--sprint", "S9");
  assert.notEqual(bad.code, 0);
  assert.match(bad.err, /Unknown sprint "S9"/);
  assert.match(w.cli("board").out, /Core-a[\s\S]*Core-b/); // without the flag nothing is filtered
});

test("errors: sprints off, unknown sprint or task, bad dates and numbers", () => {
  const off = repo(null);
  for (const args of [["sprint", "list"], ["sprint", "new"], ["board", "--sprint", "active"]]) {
    const r = off.cli(...args);
    assert.notEqual(r.code, 0, args.join(" "));
    assert.match(r.err, /Sprints are off/);
  }
  assert.equal(off.cli("estimate", "Core-a", "2").code, 0, "estimate works with sprints off");

  const w = repo();
  const head = w.g("rev-parse", "HEAD");
  const cases: [string[], RegExp][] = [
    [["sprint", "new", "--start", "2026-02-30"], /Invalid --start/],
    [["sprint", "new", "--start", "2026-11-20", "--end", "2026-11-10"], /End must not be before Start/],
    [["sprint", "new", "--capacity", "lots"], /Invalid --capacity/],
    [["sprint", "new", "--capacity", "1.234"], /at most 2 decimals/],
    [["sprint", "start", "S4"], /Unknown sprint "S4"/],
    [["sprint", "add", "Core-a"], /No active or planned sprint/],
    [["sprint", "add", "Nope", "S1"], /Task not found/],
    [["estimate", "Core-a", "-1"], /Invalid estimate/],
    [["estimate", "Core-a", "10001"], /at most 2 decimals|from 0 to 10000/],
    [["sprint", "complete", "S1"], /Unknown sprint/],
    [["sprint", "bogus"], /usage: gitask sprint/],
  ];
  for (const [args, re] of cases) {
    const r = w.cli(...args);
    assert.notEqual(r.code, 0, args.join(" "));
    assert.match(r.err, re, args.join(" "));
  }
  assert.equal(w.g("rev-parse", "HEAD"), head, "nothing was committed");
  assert.ok(!existsSync(join(w.tasks, "_sprints", "S1.md")));
});

function activeSprint() {
  const w = repo();
  w.cli("sprint", "new", "--name", "Close me");
  for (const t of ["Core-a", "Core-b", "Core-c"]) w.cli("sprint", "add", t);
  w.cli("estimate", "Core-a", "3");
  w.cli("estimate", "Core-b", "2");
  w.cli("sprint", "start", "S1");
  w.g("mv", "Tasks/2-todo/Core-a.md", "Tasks/5-done/Core-a.md");
  w.g("commit", "-q", "-m", "done a", "--", "Tasks/2-todo/Core-a.md", "Tasks/5-done/Core-a.md");
  return w;
}

test("sprint complete prints the plan and changes nothing without --yes or with --dry-run", () => {
  const w = activeSprint();
  const head = w.g("rev-parse", "HEAD");
  for (const extra of [[], ["--dry-run"], ["--dry-run", "--yes"]]) {
    const r = w.cli("sprint", "complete", "S1", "--unfinished", "next", "--backlog", "T-0003", ...extra);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /Committed: 3 tasks · 5 pts {3}Done: 1 · 3 pts/);
    assert.match(r.out, /Done \(1\)[\s\S]*T-0001 {2}Alpha {2}\[5-done\] {2}3 pts/);
    assert.match(r.out, /T-0002 {2}Beta {2}next \(S2\), 3-in-progress → 2-todo {2}2 pts/);
    assert.match(r.out, /T-0003 {2}Gamma {2}backlog, 2-todo → 1-backlog/);
    assert.match(r.out, /warning: Sprint S2 will be created/);
    assert.match(r.out, /Dry run: nothing was changed/);
    assert.doesNotMatch(r.out, /SECRET-BODY/);
  }
  const keep = w.cli("sprint", "complete", "active", "--unfinished", "next", "--keep-status");
  assert.match(keep.out, /T-0002 {2}Beta {2}next \(S2\), stays in 3-in-progress/);
  assert.equal(w.g("rev-parse", "HEAD"), head);
  assert.ok(!existsSync(join(w.tasks, "_sprints", "S2.md")));

  const bad = w.cli("sprint", "complete", "S1", "--unfinished", "later");
  assert.notEqual(bad.code, 0);
  assert.match(bad.err, /Invalid --unfinished "later"/);
  const notUnfinished = w.cli("sprint", "complete", "S1", "--next", "Core-a");
  assert.notEqual(notUnfinished.code, 0);
  assert.match(notUnfinished.err, /Core-a is not an unfinished task of S1/);
});

test("sprint complete --yes applies the plan in one commit", () => {
  const w = activeSprint();
  const r = w.cli("sprint", "complete", "S1", "--unfinished", "next", "--backlog", "Core-c", "--yes");
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Completed S1: 1 done, 1 to backlog, 1 to S2 \(created S2\)/);
  assert.match(r.out, /committed: sprint\(S1\): complete, 1 done, 1 to backlog, 1 to S2/);
  assert.equal(w.subject(), "sprint(S1): complete, 1 done, 1 to backlog, 1 to S2");
  assert.match(w.read("_sprints/S1.md"), /- \*\*State:\*\* closed/);
  assert.match(w.read("2-todo/Core-b.md"), /- \*\*Sprint:\*\* S2/);
  assert.doesNotMatch(w.read("1-backlog/Core-c.md"), /Sprint:/);
  assert.ok(existsSync(join(w.tasks, "_sprints", "S2.md")));
  assert.equal(w.g("show", "HEAD:other.txt"), "x");

  // A closed sprint is blocked: plan printed, non-zero exit, nothing changes.
  const head = w.g("rev-parse", "HEAD");
  const again = w.cli("sprint", "complete", "S1", "--yes");
  assert.notEqual(again.code, 0);
  assert.match(again.out, /blocked: Sprint S1 is closed/);
  assert.match(again.err, /cannot be completed \(1 blocker\); nothing was changed/);
  assert.equal(w.g("rev-parse", "HEAD"), head);
});

test("--no-commit writes without committing", () => {
  const w = repo();
  w.cli("sprint", "new");
  const head = w.g("rev-parse", "HEAD");
  const r = w.cli("sprint", "add", "Core-a", "--no-commit");
  assert.equal(r.code, 0, r.err);
  assert.doesNotMatch(r.out, /committed/);
  assert.match(w.read("2-todo/Core-a.md"), /Sprint:\*\* S1/);
  assert.equal(w.g("rev-parse", "HEAD"), head);
});
