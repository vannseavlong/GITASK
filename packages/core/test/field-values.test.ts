import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addSubtask, editSubtask, filterByFields, loadBoard, parseFieldList, parseTask, setSubtaskField, setSubtaskLane, setTaskField, splitTokens } from "../src/index.ts";
import type { FieldDef } from "../src/index.ts";

const platform: FieldDef = {
  key: "platform", label: "Platform", multi: false,
  values: [{ id: "admin-portal", label: "Admin Portal" }, { id: "app", label: "App" }, { id: "landing-page", label: "Landing Page" }],
};
const multi: FieldDef = { ...platform, multi: true };

const TASK = `# Feature

- **Owner:** Me

## Sub-tasks
- [ ] Build login @longcelot #backend #platform:app
- [ ] Hero banner #platform:landing-page
- [x] Plain one
`;

function ws() {
  const root = mkdtempSync(join(tmpdir(), "gitask-fv-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ fields: [platform] }));
  writeFileSync(join(tasks, "2-todo", "Core-feat.md"), TASK);
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, tasks, g, file: join(tasks, "2-todo", "Core-feat.md") };
}

test("splitTokens: #key:id is a field token next to @person and #lane", () => {
  assert.deepEqual(splitTokens("Build @me #backend #platform:app"), { text: "Build", assignee: "me", lane: "backend", values: { platform: ["app"] } });
  assert.deepEqual(splitTokens("X #platform:app #platform:landing-page").values, { platform: ["app", "landing-page"] });
});

test("splitTokens: look-alikes stay text", () => {
  for (const t of ["see #owner:me", "x #Platform:app", "x #platform:App", "x #platform:", "x #:app", "x #platform:app:more"]) {
    assert.equal(splitTokens(t).values, undefined, t);
    assert.equal(splitTokens(t).text.startsWith("x") || t.startsWith("see"), true);
  }
  assert.equal(splitTokens("#platform:app").text, "#platform:app"); // only tokens: kept as text
});

test("old sub-task lines parse exactly as before", () => {
  const t = parseTask("/x/Tasks/2-todo/A.md", "2-todo", "# A\n\n## Sub-tasks\n- [ ] one @a #lane\n- [ ] two #12\n");
  assert.deepEqual(t.subtasks.map((s) => [s.text, s.assignee, s.lane, s.values]), [["one", "a", "lane", undefined], ["two #12", undefined, undefined, undefined]]);
});

test("parseFieldList: ids only, in order, no duplicates", () => {
  assert.deepEqual(parseFieldList("app, admin-portal; app  Landing Page"), ["app", "admin-portal"]);
  assert.deepEqual(parseFieldList(undefined), []);
});

test("loadBoard: header values (unknown ids kept, non-ids dropped) and sub-task values", async () => {
  const w = ws();
  writeFileSync(w.file, TASK.replace("- **Owner:** Me", "- **Owner:** Me\n- **Platform:** admin-portal, bogus Nope"));
  const t = (await loadBoard(w.tasks)).columns[0].tasks[0];
  assert.deepEqual(t.values, { platform: ["admin-portal", "bogus"] });
  assert.deepEqual(t.subtasks.map((s) => s.values?.platform), [["app"], ["landing-page"], undefined]);
});

test("loadBoard: no fields configured leaves values unset", async () => {
  const w = ws();
  writeFileSync(join(w.tasks, "gitask.json"), "{}");
  assert.equal((await loadBoard(w.tasks)).columns[0].tasks[0].values, undefined);
});

test("setSubtaskField: changes only that line, keeps @person and #lane, commits that file", async () => {
  const w = ws();
  const task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  const r = await setSubtaskField(task, 0, platform, ["admin-portal"]);
  assert.equal(r.committed, true);
  const lines = readFileSync(w.file, "utf8").split("\n");
  assert.equal(lines[5], "- [ ] Build login @longcelot #backend #platform:admin-portal");
  assert.equal(lines[6], "- [ ] Hero banner #platform:landing-page");
  assert.equal(w.g("show", "--stat", "--format=", "HEAD").includes("Core-feat.md"), true);
  const again = (await loadBoard(w.tasks)).columns[0].tasks[0];
  await setSubtaskField(again, 2, platform, ["app"]);
  await setSubtaskField((await loadBoard(w.tasks)).columns[0].tasks[0], 2, platform, []);
  assert.equal(readFileSync(w.file, "utf8").split("\n")[7], "- [x] Plain one");
  await setSubtaskLane((await loadBoard(w.tasks)).columns[0].tasks[0], 0, undefined);
  assert.equal(readFileSync(w.file, "utf8").split("\n")[5], "- [ ] Build login @longcelot #platform:admin-portal");
});

test("setSubtaskField refuses unknown ids, duplicates and several values on a single field", async () => {
  const w = ws();
  const task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  for (const ids of [["nope"], ["app", "app"], ["app", "admin-portal"], ["App"]]) await assert.rejects(setSubtaskField(task, 0, platform, ids));
  await setSubtaskField(task, 0, multi, ["app", "admin-portal"]);
  assert.match(readFileSync(w.file, "utf8"), /#platform:app #platform:admin-portal/);
  assert.equal(w.g("status", "--porcelain"), "");
});

test("setSubtaskField refuses a file that changed since it was read", async () => {
  const w = ws();
  const task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  writeFileSync(w.file, TASK.replace("#platform:app", "#platform:admin-portal"));
  await assert.rejects(setSubtaskField(task, 0, platform, ["app"]), /changed since/);
});

test("editSubtask and addSubtask: field tokens in text are refused; values can be added", async () => {
  const w = ws();
  const task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  await assert.rejects(editSubtask(task, 0, { text: "Build #platform:app" }));
  await addSubtask(task, "New thing", { values: { platform: ["app"] } });
  assert.match(readFileSync(w.file, "utf8"), /- \[ \] New thing #platform:app\n$/);
  await assert.rejects(addSubtask(task, "Bad", { values: { Owner: ["x"] } }));
});

test("setTaskField: inserts, updates and clears the header line; other lines untouched", async () => {
  const w = ws();
  let task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  await setTaskField(task, multi, ["app", "landing-page"]);
  assert.match(readFileSync(w.file, "utf8"), /- \*\*Owner:\*\* Me\n- \*\*Platform:\*\* app, landing-page\n/);
  task = (await loadBoard(w.tasks)).columns[0].tasks[0];
  assert.deepEqual(task.values, { platform: ["app", "landing-page"] });
  await setTaskField(task, multi, ["admin-portal"]);
  assert.match(readFileSync(w.file, "utf8"), /\*\*Platform:\*\* admin-portal\n/);
  await setTaskField((await loadBoard(w.tasks)).columns[0].tasks[0], multi, []);
  assert.deepEqual((await loadBoard(w.tasks)).columns[0].tasks[0].values, {});
  await assert.rejects(setTaskField(task, platform, ["nope"]));
});

test("filterByFields: AND across fields, OR within one, sub-tasks count", async () => {
  const w = ws();
  mkdirSync(join(w.tasks, "3-in-progress"));
  writeFileSync(join(w.tasks, "3-in-progress", "Core-other.md"), "# Other\n\n- **Platform:** app\n- **Env:** prod\n");
  const env: FieldDef = { key: "env", label: "Env", multi: false, values: [{ id: "prod", label: "Prod" }, { id: "dev", label: "Dev" }] };
  writeFileSync(join(w.tasks, "gitask.json"), JSON.stringify({ fields: [platform, env] }));
  const board = await loadBoard(w.tasks);
  const ids = (sel: Record<string, string[]>) => filterByFields(board, sel).columns.flatMap((c) => c.tasks.map((t) => t.id)).sort();
  assert.deepEqual(ids({}), ["Core-feat", "Core-other"]);
  assert.deepEqual(ids({ platform: [] }), ["Core-feat", "Core-other"]);
  assert.deepEqual(ids({ platform: ["app"] }), ["Core-feat", "Core-other"]); // feat via its sub-task
  assert.deepEqual(ids({ platform: ["landing-page"] }), ["Core-feat"]);
  assert.deepEqual(ids({ platform: ["landing-page", "admin-portal"] }), ["Core-feat"]);
  assert.deepEqual(ids({ platform: ["app"], env: ["prod"] }), ["Core-other"]);
  assert.deepEqual(ids({ platform: ["admin-portal"] }), []);
  assert.equal(filterByFields(board, undefined), board);
});
