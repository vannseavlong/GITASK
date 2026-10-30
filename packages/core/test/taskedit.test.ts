import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editTaskText, updateTask, editSubtask, deleteSubtask, parseTask } from "../src/index.ts";

const BODY = `# Core-demo

- **ID:** T-0007
- **Owner:** Sam
- **Tier:** T2 · new feature
- **Started / updated:** 2026-01-01 / 2026-01-01

## Sub-tasks
- [ ] Build login @sam #backend
- [x] Design form
- [ ] Last one
`;

function repo(text = BODY) {
  const root = mkdtempSync(join(tmpdir(), "gitask-edit-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  const path = join(tasks, "2-todo", "Core-demo.md");
  writeFileSync(path, text);
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt"); g("commit", "-q", "-m", "init");
  const task = () => parseTask(path, "2-todo", readFileSync(path, "utf8"));
  return { root, tasks, path, g, task };
}

test("editTaskText changes only the patched lines and keeps the tier explanation", () => {
  const out = editTaskText(BODY, { title: "New title", due: "2026-12-01", tier: "T3", claimedBy: "agent 7" });
  assert.equal(
    out,
    BODY.replace("# Core-demo", "# New title").replace("T2 · new feature", "T3 · new feature").replace("2026-01-01 / 2026-01-01\n", "2026-01-01 / 2026-01-01\n- **Due:** 2026-12-01\n- **Claimed by:** agent 7\n"),
  );
});

test("missing fields are inserted after the last header field, before the first section", () => {
  const out = editTaskText("# T\n\n- **Owner:** Sam\n\n## Goal\nx\n", { due: "2026-02-03", tier: "T1" });
  assert.equal(out, "# T\n\n- **Owner:** Sam\n- **Due:** 2026-02-03\n- **Tier:** T1\n\n## Goal\nx\n");
  assert.equal(editTaskText("# T\n\n## Goal\n", { due: "2026-02-03" }), "# T\n\n- **Due:** 2026-02-03\n\n## Goal\n");
  assert.equal(editTaskText("no heading\n", { title: "Hi" }), "# Hi\n\nno heading\n");
});

test("clearing: due and tier become empty, claimed by becomes none, owner removed; a missing field stays missing", () => {
  const raw = "# T\n\n- **Due:** 2026-01-01\n- **Tier:** T1\n- **Claimed by:** me\n- **Owner:** Sam\n";
  const out = editTaskText(raw, { due: null, tier: null, claimedBy: null, owner: null });
  const t = parseTask("/x/2-todo/T.md", "2-todo", out);
  assert.equal(t.due, undefined);
  assert.equal(t.tier, undefined);
  assert.equal(t.claimedBy, undefined);
  assert.equal(t.owner, undefined);
  assert.equal(editTaskText("# T\n", { due: null, owner: null }), "# T\n");
});

test("CRLF and mixed endings are kept per line, including inserted lines", () => {
  const raw = "# T\r\n\r\n- **Owner:** Sam\r\n- **Tier:** T1\n\n## Goal\r\nx\n";
  const out = editTaskText(raw, { title: "U", tier: "T2", due: "2026-05-05" });
  assert.equal(out, "# U\r\n\r\n- **Owner:** Sam\r\n- **Tier:** T2\n- **Due:** 2026-05-05\n\n## Goal\r\nx\n");
  assert.equal(editTaskText("# T\r\n\r\n- **Tier:** T1\r\n", { tier: "T0" }), "# T\r\n\r\n- **Tier:** T0\r\n");
});

test("dollar sequences are written literally", () => {
  for (const v of ["a $& b", "$1 $$ $` $' $<x>"]) {
    const out = editTaskText(BODY, { title: v, claimedBy: v });
    assert.ok(out.includes(`# ${v}\n`), out);
    assert.ok(out.includes(`- **Claimed by:** ${v}\n`), out);
    const out2 = editTaskText("# T\n\n- **Claimed by:** x\n", { claimedBy: v });
    assert.ok(out2.includes(`- **Claimed by:** ${v}\n`), out2);
  }
});

test("newlines and control characters are refused: no header or checkbox injection", () => {
  for (const bad of ["a\n- **Owner:** evil", "a\r- [ ] x", "a b", "a\u0000b", "", "   "]) {
    assert.throws(() => editTaskText(BODY, { title: bad }), /one line/);
    assert.throws(() => editTaskText(BODY, { claimedBy: bad }), /one line/);
    assert.throws(() => editTaskText(BODY, { owner: bad }), /one line/);
  }
  assert.throws(() => editTaskText(BODY, { due: "2026-02-30" }), /real date/);
  assert.throws(() => editTaskText(BODY, { tier: "T9" as "T1" }), /Tier/);
  assert.throws(() => editTaskText(BODY, { title: "x".repeat(201) }), /one line/);
});

test("updateTask edits, keeps id and file name, and commits only that file by pathspec", async () => {
  const r = repo();
  writeFileSync(join(r.root, "other.txt"), "dirty and unstaged");
  const res = await updateTask(r.task(), { title: "Renamed", tier: "T0", owner: "ann-roe" });
  assert.deepEqual([res.changed, res.committed], [true, true]);
  const t = r.task();
  assert.equal(t.title, "Renamed");
  assert.equal(t.tier, "T0");
  assert.equal(t.owner, "ann-roe");
  assert.equal(t.displayId, "T-0007");
  assert.equal(t.id, "Core-demo");
  assert.equal(r.g("show", "--name-only", "--format=%s", "HEAD"), "task(Core-demo): edit title, tier, owner\n\nTasks/2-todo/Core-demo.md");
  assert.equal(r.g("status", "--porcelain"), "M other.txt");
  assert.deepEqual(await updateTask(r.task(), { title: "Renamed" }), { path: r.path, changed: false, committed: false });
});

test("updateTask refuses a symlinked task file", async () => {
  const r = repo();
  const victim = join(r.root, "victim.md");
  writeFileSync(victim, BODY);
  const link = join(r.tasks, "2-todo", "Link.md");
  symlinkSync(victim, link);
  await assert.rejects(updateTask(parseTask(link, "2-todo", BODY), { title: "pwn" }), /not a regular file/);
  assert.equal(readFileSync(victim, "utf8"), BODY);
});

test("editSubtask rewrites only that line, CRLF kept; text with $& and tokens as fields", async () => {
  const r = repo(BODY.replace(/\n/g, "\r\n"));
  await editSubtask(r.task(), 0, { text: "Fix $& and $1", assignee: "ann-roe", lane: "frontend" });
  const raw = readFileSync(r.path, "utf8");
  assert.ok(raw.includes("- [ ] Fix $& and $1 @ann-roe #frontend\r\n"), raw);
  assert.equal(raw.replace(/- \[ \] Fix[^\r]*/, "- [ ] Build login @sam #backend"), BODY.replace(/\n/g, "\r\n"));
  await editSubtask(r.task(), 0, { assignee: null, lane: null });
  assert.ok(readFileSync(r.path, "utf8").includes("- [ ] Fix $& and $1\r\n"));
  assert.equal(r.g("log", "-1", "--format=%s").startsWith("task(Core-demo): sub-task"), true);
});

test("editSubtask refuses newline / checkbox / trailing-token text and a stale file", async () => {
  const r = repo();
  const t = r.task();
  for (const bad of ["a\n- [ ] injected", "a\r\n## Goal", "has [x] box", "", "ends @bob", "ends #lane"]) {
    await assert.rejects(editSubtask(t, 0, { text: bad }), /Sub-task text/);
  }
  writeFileSync(r.path, "extra\n" + BODY);
  await assert.rejects(editSubtask(t, 0, { text: "ok" }), /changed since/);
});

test("deleteSubtask removes exactly that line, keeps the rest, commits by pathspec", async () => {
  const r = repo(BODY.replace(/\n/g, "\r\n"));
  await deleteSubtask(r.task(), 1);
  assert.equal(readFileSync(r.path, "utf8"), BODY.replace(/\n/g, "\r\n").replace("- [x] Design form\r\n", ""));
  assert.equal(r.g("show", "--name-only", "--format=", "HEAD"), "Tasks/2-todo/Core-demo.md");
  // stale: the task object still points at the old line numbers
  const stale = parseTask(r.path, "2-todo", BODY);
  await assert.rejects(deleteSubtask(stale, 2), /changed since/);
  await assert.rejects(deleteSubtask(r.task(), 9), /No sub-task/);
});

test("deleteSubtask refuses a line that holds several checkboxes", async () => {
  const r = repo("# T\n\n## Gates\n- [ ] G1  - [x] G2\n");
  await assert.rejects(deleteSubtask(r.task(), 0), /several checkboxes/);
});
