import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTask, addSubtask, setSubtaskAssignee, setSubtaskLane, toggleSubtask } from "../src/index.ts";

const BODY = `# Core-demo

- **Owner:** Sam

## Gates
- [ ] G1 scope #backend  - [x] G2 static @sam

## Done when
- [x] first @sam
- [ ] second

## Sub-tasks
- [ ] Build login API @snlrlong #backend
- [x] Design form #ux-ui @Dana.Lee
- [ ] Plain one
- [ ] Mail bob@example.com about #12
\`\`\`
- [ ] fenced @ghost #lane
\`\`\`

## Notes
- [ ] after
`;

const parse = (c: string, path = "/x/2-todo/Core-demo.md") => parseTask(path, "2-todo", c);

function repo(text: string) {
  const root = mkdtempSync(join(tmpdir(), "gitask-sub-"));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  g("init", "-q");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  mkdirSync(join(root, "Tasks", "2-todo"), { recursive: true });
  const path = join(root, "Tasks", "2-todo", "Core-demo.md");
  writeFileSync(path, text);
  writeFileSync(join(root, "other.txt"), "x");
  g("add", "Tasks");
  g("commit", "-qm", "init");
  return { root, path, g };
}

test("parse: tokens stripped from text, plain lines unchanged", () => {
  const t = parse(BODY);
  const sub = t.subtasks.filter((s) => s.section === "Sub-tasks");
  assert.deepEqual(
    sub.map((s) => [s.text, s.assignee, s.lane, s.checked]),
    [
      ["Build login API", "snlrlong", "backend", false],
      ["Design form", "Dana.Lee", "ux-ui", true],
      ["Plain one", undefined, undefined, false],
      ["Mail bob@example.com about #12", undefined, undefined, false],
    ],
  );
  assert.ok(!("assignee" in sub[2]) && !("lane" in sub[2]));
});

test("parse: gate rows with several checkboxes and other sections keep their text", () => {
  const t = parse(BODY);
  assert.deepEqual(t.subtasks.filter((s) => s.section === "Gates").map((s) => [s.text, s.assignee, s.lane]), [
    ["G1 scope #backend", undefined, undefined],
    ["G2 static @sam", undefined, undefined],
  ]);
  assert.equal(t.subtasks.find((s) => s.section === "Done when" && s.checked)?.text, "first @sam");
});

test("parse: tokens inside code fences are ignored (line not a sub-task)", () => {
  assert.ok(!parse(BODY).subtasks.some((s) => s.text.includes("fenced") || s.assignee === "ghost"));
});

test("parse: unknown @id is kept as the assignee string; mid-text @ stays text", () => {
  const t = parse("# T\n\n## Sub-tasks\n- [ ] ask @nobody-here about it\n- [ ] do it @nobody-here\n");
  assert.equal(t.subtasks[0].text, "ask @nobody-here about it");
  assert.equal(t.subtasks[0].assignee, undefined);
  assert.equal(t.subtasks[1].assignee, "nobody-here");
});

test("progressOf counts Done when and Sub-tasks; old tasks keep their numbers", () => {
  assert.deepEqual(parse(BODY).progress, { done: 2, total: 6 });
  assert.deepEqual(parse("# T\n\n## Done when\n- [x] a\n- [ ] b\n\n## Gates\n- [ ] G1\n").progress, { done: 1, total: 2 });
});

for (const eol of ["\n", "\r\n"]) {
  const label = eol === "\n" ? "LF" : "CRLF";

  test(`setSubtaskAssignee / setSubtaskLane edit only that line, commit by pathspec (${label})`, async () => {
    const text = BODY.replace(/\n/g, eol);
    const { root, path, g } = repo(text);
    writeFileSync(join(root, "other.txt"), "dirty");
    g("add", "other.txt");
    let task = parse(text, path);
    const i = task.subtasks.findIndex((s) => s.text === "Plain one");
    assert.equal((await setSubtaskAssignee(task, i, "sam")).committed, true);
    assert.equal(readFileSync(path, "utf8"), text.replace("- [ ] Plain one", "- [ ] Plain one @sam"));
    task = parse(readFileSync(path, "utf8"), path);
    await setSubtaskLane(task, i, "frontend");
    assert.equal(readFileSync(path, "utf8"), text.replace("- [ ] Plain one", "- [ ] Plain one @sam #frontend"));
    task = parse(readFileSync(path, "utf8"), path);
    await setSubtaskAssignee(task, task.subtasks.findIndex((s) => s.text === "Build login API"), undefined);
    assert.equal(
      readFileSync(path, "utf8"),
      text.replace("- [ ] Plain one", "- [ ] Plain one @sam #frontend").replace("API @snlrlong #backend", "API #backend"),
    );
    assert.match(g("show", "--stat", "--format=%s", "HEAD"), /Core-demo\.md/);
    assert.ok(!g("show", "--stat", "--format=", "HEAD").includes("other.txt"));
    assert.match(g("status", "--porcelain"), /^A\s+other\.txt/m); // staged file left alone
  });

  test(`addSubtask appends in the section or creates it (${label})`, async () => {
    const text = BODY.replace(/\n/g, eol);
    const { path } = repo(text);
    const r = await addSubtask(parse(text, path), "Write tests", { assignee: "sam", lane: "backend" });
    assert.equal(r.committed, true);
    const out = readFileSync(path, "utf8");
    assert.equal(out, text.replace("```" + eol + eol + "## Notes", "```" + eol + "- [ ] Write tests @sam #backend" + eol + eol + "## Notes"));
    const t = parse(out, path);
    assert.deepEqual(t.subtasks.find((s) => s.text === "Write tests"), {
      section: "Sub-tasks", text: "Write tests", checked: false, line: r.line, col: 3, assignee: "sam", lane: "backend",
    });

    const bare = "# Core-demo" + eol + eol + "- **Owner:** Sam" + eol;
    const b = repo(bare);
    await addSubtask(parse(bare, b.path), "First", {}, { commit: false });
    assert.equal(readFileSync(b.path, "utf8"), bare + eol + "## Sub-tasks" + eol + eol + "- [ ] First" + eol);
  });
}

test("toggleSubtask still works on a tokenised line", async () => {
  const { path } = repo(BODY);
  const task = parse(BODY, path);
  await toggleSubtask(task, task.subtasks.findIndex((s) => s.text === "Build login API"));
  assert.equal(readFileSync(path, "utf8"), BODY.replace("- [ ] Build login API", "- [x] Build login API"));
});

test("refuses bad input and stale reads", async () => {
  const { path } = repo(BODY);
  const task = parse(BODY, path);
  const i = task.subtasks.findIndex((s) => s.text === "Plain one");
  await assert.rejects(setSubtaskAssignee(task, i, "bad id"), /Invalid assignee/);
  await assert.rejects(setSubtaskLane(task, i, "1x"), /Invalid lane/);
  await assert.rejects(addSubtask(task, "a\nb"), /one non-empty line/);
  await assert.rejects(setSubtaskLane(task, 0, "x"), /not under/); // a gate row
  await assert.rejects(setSubtaskLane(task, 99, "x"), /No sub-task/);
  writeFileSync(path, BODY.replace("Plain one", "Changed"));
  await assert.rejects(setSubtaskLane(task, i, "x"), /changed since/);
});
