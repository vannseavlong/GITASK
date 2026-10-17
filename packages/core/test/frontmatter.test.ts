import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTask, parseFrontmatter, toggleSubtask } from "../src/index.ts";

const FM = `---
# a comment
owner: Sam
tier: T2
claimed_by: "Ana B"
started: 2026-01-01
updated: '2026-01-02'   # trailing
due: 2026-03-05
depends_on: Core-base, Core-other
status: 4-testing
---
# Core-demo

## Done when
- [ ] first
\`\`\`
- [ ] fenced
\`\`\`
- [x] second
`;
const known = new Set(["Core-base", "Core-other", "Core-demo"]);
const parse = (c: string) => parseTask("/x/2-todo/Core-demo.md", "2-todo", c, known);

test("frontmatter maps to the same fields as the bullet header", () => {
  const t = parse(FM);
  assert.equal(t.owner, "Sam");
  assert.equal(t.tier, "T2");
  assert.equal(t.claimedBy, "Ana B");
  assert.equal(t.fields["updated"], "2026-01-02");
  assert.equal(t.due, "2026-03-05");
  assert.deepEqual(t.dependsOn, ["Core-base", "Core-other"]);
  assert.equal(t.title, "Core-demo");
  assert.equal(t.column, "2-todo");
  assert.equal(t.fields["status"], undefined);
});

test("camelCase and spaced keys; YAML list under a key", () => {
  const fm = parseFrontmatter("---\nclaimedBy: Zed\ndepends on: A\nDepends_On:\n  - B\n  - C\n---\n")!;
  assert.equal(fm.fields["claimed by"], "Zed");
  assert.equal(fm.fields["depends on"], "B, C");
});

test("sub-task lines are real file lines", () => {
  const t = parse(FM);
  assert.deepEqual(t.subtasks.map((s) => [s.text, s.line]), [["first", 15], ["second", 19]]);
  assert.deepEqual(t.progress, { done: 1, total: 2 });
  assert.equal(FM.split("\n")[14], "- [ ] first");
});

test("checkboxes inside frontmatter are not sub-tasks", () => {
  const t = parse("---\nnote: x\n- [ ] sneaky\n---\n# T\n- [ ] real\n");
  assert.deepEqual(t.subtasks.map((s) => s.text), ["real"]);
});

test("bullet header wins when both exist", () => {
  const t = parse("---\nowner: FromYaml\ntier: T3\n---\n# Core-demo\n\n- **Owner:** FromBullet\n\n## Goal\n");
  assert.equal(t.owner, "FromBullet");
  assert.equal(t.tier, "T3");
});

test("bullet format alone is unchanged", () => {
  const t = parse("# Core-demo\n\n- **Owner:** Sam\n- **Tier:** T1\n\n## Done when\n- [ ] a\n");
  assert.equal(t.owner, "Sam");
  assert.equal(t.subtasks[0].line, 7);
});

test("CRLF frontmatter", () => {
  const t = parse(FM.replace(/\n/g, "\r\n"));
  assert.equal(t.owner, "Sam");
  assert.equal(t.claimedBy, "Ana B");
  assert.equal(t.title, "Core-demo");
  assert.deepEqual(t.subtasks.map((s) => s.line), [15, 19]);
});

test("malformed frontmatter never throws and is plain content", () => {
  for (const c of [
    "---\nowner: Sam\n# Core-demo\n- [ ] a\n", // unclosed
    "---\nthis is not yaml\n---\n# Core-demo\n- [ ] a\n",
    "---\n---\n# Core-demo\n- [ ] a\n",
    "---",
    "",
  ]) {
    const t = parse(c);
    assert.ok(t);
    assert.equal(t.owner, undefined);
  }
  assert.equal(parse("---\nowner: Sam\n# Core-demo\n- [ ] a\n").subtasks.length, 1);
  assert.equal(parseFrontmatter("---\nthis is not yaml\n---\n"), undefined);
});

test("toggleSubtask after frontmatter edits the right line (git, CRLF)", async () => {
  for (const eol of ["\n", "\r\n"]) {
    const root = mkdtempSync(join(tmpdir(), "gitask-fm-"));
    const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    mkdirSync(join(root, "Tasks", "2-todo"), { recursive: true });
    const path = join(root, "Tasks", "2-todo", "Core-demo.md");
    const text = FM.replace(/\n/g, eol);
    writeFileSync(path, text);
    g("add", "Tasks");
    g("commit", "-qm", "init");
    const task = parseTask(path, "2-todo", text, known);
    const idx = task.subtasks.findIndex((s) => s.text === "first");
    const r = await toggleSubtask(task, idx);
    assert.equal(r.checked, true);
    assert.equal(r.committed, true);
    assert.equal(readFileSync(path, "utf8"), text.replace("- [ ] first", "- [x] first"));
    assert.equal(g("status", "--porcelain").trim(), "");
  }
});
