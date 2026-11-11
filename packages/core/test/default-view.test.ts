import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOARD_VIEWS, FALLBACK_VIEW, parseDefaultView, readDefaultView } from "../src/index.ts";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-view-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  writeFileSync(join(tasks, "1-backlog", ".gitkeep"), "");
  g("add", "Tasks");
  g("commit", "-q", "-m", "init");
  return { root, tasks };
}

test("parseDefaultView: every known view is kept", () => {
  for (const v of BOARD_VIEWS) assert.equal(parseDefaultView(JSON.stringify({ defaultView: v })), v);
});

test("parseDefaultView: missing, unknown, wrong type or malformed means overview", () => {
  assert.equal(FALLBACK_VIEW, "overview");
  for (const text of ["{}", '{"defaultView":"kanban"}', '{"defaultView":"Board"}', '{"defaultView":" board"}', '{"defaultView":2}', '{"defaultView":null}', '{"defaultView":["board"]}', '{"defaultView":"__proto__"}', "[]", '"board"', "not json", ""]) {
    assert.equal(parseDefaultView(text), "overview", text);
  }
});

test("parseDefaultView: other keys are ignored", () => {
  assert.equal(parseDefaultView('{"columns":{"2-todo":{"color":"#112233"}},"project":{"title":"X"},"defaultView":"timeline"}'), "timeline");
});

test("readDefaultView: reads Tasks/gitask.json in a git repo", async () => {
  const { tasks } = repo();
  assert.equal(await readDefaultView(tasks), "overview"); // no file
  writeFileSync(join(tasks, "gitask.json"), '{"defaultView":"list"}\n');
  assert.equal(await readDefaultView(tasks), "list");
  writeFileSync(join(tasks, "gitask.json"), '{"defaultView":"nope"}\n');
  assert.equal(await readDefaultView(tasks), "overview");
  writeFileSync(join(tasks, "gitask.json"), "{broken");
  assert.equal(await readDefaultView(tasks), "overview");
});

test("readDefaultView: a symlinked config is not followed", async () => {
  const { root, tasks } = repo();
  writeFileSync(join(root, "elsewhere.json"), '{"defaultView":"board"}');
  symlinkSync(join(root, "elsewhere.json"), join(tasks, "gitask.json"));
  assert.equal(await readDefaultView(tasks), "overview");
});

test("BOARD_VIEWS matches the extension's VIEW_IDS (and so the UI registry)", async () => {
  const { VIEW_IDS } = await import("../../vscode/src/view-ids.ts");
  assert.deepEqual([...BOARD_VIEWS], [...VIEW_IDS]);
});
