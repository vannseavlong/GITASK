import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadBoard, parseTask, parseSprintConfig, readSprintConfig, parseSprint, readSprints, pickActiveSprint, nextSprintId,
  sprintDefaults, isFieldKey, RESERVED_FIELD_KEYS, parseFields, MAX_TASK_BYTES,
} from "../src/index.ts";

const COLUMNS = ["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done", "6-deploy"];
const TASK = (extra = "") => `# Demo\n\n- **Owner:** Sam\n${extra}\n## Goal\nx\n`;
const SPRINT = (h: Record<string, string>, title = "# Sprint 7") =>
  `${title}\n${Object.entries(h).map(([k, v]) => `- **${k}:** ${v}`).join("\n")}\n\n## Review\n- **State:** closed\n`;

/** A real temp git repo with a Tasks/ folder, committed. */
function workspace(config?: unknown, sprints: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "gitask-sprint-"));
  const tasks = join(root, "Tasks");
  for (const c of COLUMNS) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "Core-a.md"), TASK("- **Sprint:** S7\n- **Estimate:** 3\n"));
  writeFileSync(join(tasks, "1-backlog", "Core-b.md"), TASK());
  if (config !== undefined) writeFileSync(join(tasks, "gitask.json"), typeof config === "string" ? config : JSON.stringify(config));
  if (Object.keys(sprints).length) {
    mkdirSync(join(tasks, "_sprints"));
    for (const [name, text] of Object.entries(sprints)) writeFileSync(join(tasks, "_sprints", name), text);
  }
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "-A");
  g("commit", "-q", "-m", "init");
  return { root, tasks };
}

test("parseSprintConfig: no block, malformed or non-object means off", () => {
  for (const t of ["", "{", "null", "[]", "{}", '{"sprint":true}', '{"sprint":[]}', '{"sprint":null}', '{"sprint":"on"}']) {
    assert.equal(parseSprintConfig(t), undefined, t);
  }
});

test("parseSprintConfig: an empty block turns sprints on with defaults", () => {
  assert.deepEqual(parseSprintConfig('{"sprint":{}}'), sprintDefaults());
  assert.deepEqual(sprintDefaults(), { lengthDays: 14, estimate: "points", doneColumns: ["5-done", "6-deploy"], unfinished: "backlog", resetStatus: "2-todo" });
});

test("parseSprintConfig: valid values are kept", () => {
  const c = parseSprintConfig(JSON.stringify({ sprint: { lengthDays: 7, estimate: "hours", doneColumns: ["4-testing", "5-done", "5-done"], unfinished: "next", resetStatus: null } }), COLUMNS);
  assert.deepEqual(c, { lengthDays: 7, estimate: "hours", doneColumns: ["4-testing", "5-done"], unfinished: "next", resetStatus: null });
});

test("parseSprintConfig: each bad key falls back to its default alone", () => {
  for (const lengthDays of [0, 61, 7.5, "14", -1, null]) {
    assert.equal(parseSprintConfig(JSON.stringify({ sprint: { lengthDays, estimate: "none" } }))!.lengthDays, 14);
  }
  const c = parseSprintConfig(JSON.stringify({ sprint: { lengthDays: 60, estimate: "days", doneColumns: ["done", 5, "9-nope"], unfinished: "drop", resetStatus: "9-nope" } }), COLUMNS)!;
  assert.deepEqual(c, { ...sprintDefaults(), lengthDays: 60 });
  // Unknown column ids are dropped one by one; without the column list only the syntax is checked.
  assert.deepEqual(parseSprintConfig(JSON.stringify({ sprint: { doneColumns: ["9-nope", "6-deploy"] } }), COLUMNS)!.doneColumns, ["6-deploy"]);
  assert.deepEqual(parseSprintConfig(JSON.stringify({ sprint: { doneColumns: ["9-nope"], resetStatus: "9-nope" } }))!.doneColumns, ["9-nope"]);
  assert.equal(parseSprintConfig(JSON.stringify({ sprint: { resetStatus: "../x" } }))!.resetStatus, "2-todo");
  assert.equal(parseSprintConfig(JSON.stringify({ sprint: { resetStatus: 3 } }))!.resetStatus, "2-todo");
});

test("readSprintConfig: missing file or symlinked file means off", async () => {
  const { tasks } = workspace();
  assert.equal(await readSprintConfig(tasks), undefined);
  const outside = join(mkdtempSync(join(tmpdir(), "gitask-out-")), "x.json");
  writeFileSync(outside, '{"sprint":{}}');
  symlinkSync(outside, join(tasks, "gitask.json"));
  assert.equal(await readSprintConfig(tasks), undefined);
});

test("parseSprint: full file", () => {
  const s = parseSprint("/t/_sprints/S7.md", SPRINT({ ID: "S7", State: "active", Start: "2026-11-16", End: "2026-11-29", Goal: "Ship sprint planning", Capacity: "30" }));
  assert.deepEqual(s, { id: "S7", number: 7, name: "Sprint 7", state: "active", start: "2026-11-16", end: "2026-11-29", goal: "Ship sprint planning", capacity: 30, path: "/t/_sprints/S7.md" });
});

test("parseSprint: bad values dropped one by one, defaults filled", () => {
  const s = parseSprint("/t/_sprints/S12.md", SPRINT({ State: "running", Start: "2026-02-30", End: "2026-11-29", Goal: "  ", Capacity: "-3" }, "no heading"))!;
  assert.deepEqual(s, { id: "S12", number: 12, name: "Sprint 12", state: "planned", end: "2026-11-29", path: "/t/_sprints/S12.md" });
  // End before Start is dropped; Start stays. State is case-insensitive. Lines under `##` are not header.
  const t = parseSprint("/t/_sprints/S1.md", SPRINT({ State: "Closed", Start: "2026-11-16", End: "2026-11-01", Capacity: "1.255" }, "# Launch\u0007 week"))!;
  assert.equal(t.state, "closed");
  assert.equal(t.start, "2026-11-16");
  assert.equal(t.end, undefined);
  assert.equal(t.capacity, undefined);
  assert.equal(t.name, "Launch  week");
  assert.equal(parseSprint("/t/_sprints/S2.md", SPRINT({}))!.state, "planned"); // ## Review State line ignored
});

test("parseSprint: only S<n>.md names are sprints; the ID header never overrides the file name", () => {
  for (const n of ["s7.md", "S07.md", "S0.md", "Sprint7.md", "S7.txt", "S7.md.bak", "README.md"]) assert.equal(parseSprint(`/t/_sprints/${n}`, SPRINT({})), undefined, n);
  assert.equal(parseSprint("/t/_sprints/S3.md", SPRINT({ ID: "S9" }))!.id, "S3");
});

test("readSprints: sorted, regular files only, never throws", async () => {
  const big = "# Big\n" + "x".repeat(MAX_TASK_BYTES + 1);
  const { tasks, root } = workspace({ sprint: {} }, {
    "S10.md": SPRINT({ State: "planned" }, "# Ten"),
    "S2.md": SPRINT({ State: "closed" }, "# Two"),
    "notes.md": "# not a sprint",
    "S5.md": big,
  });
  mkdirSync(join(tasks, "_sprints", "S3.md")); // a folder named like a sprint
  const victim = join(root, "victim.md");
  writeFileSync(victim, SPRINT({ State: "active" }, "# Evil"));
  symlinkSync(victim, join(tasks, "_sprints", "S4.md"));
  symlinkSync(join(root, "nope.md"), join(tasks, "_sprints", "S6.md")); // dangling
  const list = await readSprints(tasks);
  assert.deepEqual(list.map((s) => [s.id, s.name]), [["S2", "Two"], ["S10", "Ten"]]);
  assert.equal(nextSprintId(list), "S11");
  assert.equal(nextSprintId([]), "S1");
});

test("readSprints: missing or symlinked _sprints folder yields none", async () => {
  const { tasks, root } = workspace({ sprint: {} });
  assert.deepEqual(await readSprints(tasks), []);
  const elsewhere = join(root, "elsewhere");
  mkdirSync(elsewhere);
  writeFileSync(join(elsewhere, "S1.md"), SPRINT({ State: "active" }));
  symlinkSync(elsewhere, join(tasks, "_sprints"));
  assert.deepEqual(await readSprints(tasks), []);
});

test("pickActiveSprint: lowest active number wins with a warning", () => {
  const mk = (n: number, state: "planned" | "active" | "closed") => ({ id: `S${n}`, number: n, name: `Sprint ${n}`, state, path: `/t/S${n}.md` });
  assert.deepEqual(pickActiveSprint([]), { active: undefined, warnings: [] });
  assert.deepEqual(pickActiveSprint([mk(1, "closed"), mk(2, "active")]), { active: "S2", warnings: [] });
  const r = pickActiveSprint([mk(9, "active"), mk(3, "active"), mk(5, "active")]);
  assert.equal(r.active, "S3");
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /S3.*S5, S9/);
});

test("Task.sprint and Task.estimate from the header", () => {
  const t = (extra: string) => parseTask("/x/2-todo/A.md", "2-todo", TASK(extra));
  const a = t("- **Sprint:** s7\n- **Estimate:** 2.5\n");
  assert.equal(a.sprint, "S7");
  assert.equal(a.estimate, 2.5);
  assert.equal(t("- **Estimate:** 0\n").estimate, 0);
  for (const bad of ["-1", "1.234", "abc", "", "3 pts", "1e3", "10001"]) assert.equal(t(`- **Estimate:** ${bad}\n`).estimate, undefined, bad);
  for (const bad of ["Sprint 7", "S0", "S07", "7", "none", ""]) assert.equal(t(`- **Sprint:** ${bad}\n`).sprint, undefined, bad);
  // Absent headers add no keys, so the serialised task is unchanged.
  const b = t("");
  assert.ok(!("sprint" in b) && !("estimate" in b));
});

test("sprint and estimate are reserved field keys", () => {
  assert.ok(RESERVED_FIELD_KEYS.includes("sprint") && RESERVED_FIELD_KEYS.includes("estimate"));
  assert.equal(isFieldKey("sprint"), false);
  assert.equal(isFieldKey("estimate"), false);
  assert.deepEqual(parseFields(JSON.stringify({ fields: [{ key: "sprint", values: [{ id: "s7" }] }] })), []);
});

test("loadBoard: sprints off leaves the board payload as before", async () => {
  const { tasks } = workspace({ fields: [{ key: "platform", values: [{ id: "app" }] }] }, { "S1.md": SPRINT({ State: "active" }) });
  const b = await loadBoard(tasks);
  assert.equal(b.sprints, undefined);
  assert.ok(!("sprints" in b));
  assert.ok(!JSON.stringify(b).includes('"sprints"'));
  assert.deepEqual(b.columns.map((c) => c.id), COLUMNS); // _sprints is never a column
  const none = await loadBoard(workspace().tasks);
  assert.deepEqual(Object.keys(none).sort(), ["columns", "dir"]);
});

test("loadBoard: sprints on fills Board.sprints and task headers", async () => {
  const { tasks } = workspace({ sprint: { lengthDays: 10, doneColumns: ["5-done", "9-gone"] } }, {
    "S7.md": SPRINT({ State: "active", Start: "2026-11-16", End: "2026-11-29", Goal: "Ship", Capacity: "30" }),
    "S8.md": SPRINT({ State: "active" }, "# Sprint 8"),
    "S6.md": SPRINT({ State: "closed" }, "# Sprint 6"),
  });
  const b = await loadBoard(tasks);
  assert.ok(b.sprints);
  assert.equal(b.sprints.config.lengthDays, 10);
  assert.deepEqual(b.sprints.config.doneColumns, ["5-done"]);
  assert.deepEqual(b.sprints.list.map((s) => s.id), ["S6", "S7", "S8"]);
  assert.equal(b.sprints.active, "S7");
  assert.equal(b.sprints.warnings?.length, 1);
  assert.deepEqual(b.columns.map((c) => c.id), COLUMNS);
  const a = b.columns.find((c) => c.id === "2-todo")!.tasks[0];
  assert.equal(a.sprint, "S7");
  assert.equal(a.estimate, 3);
  // Round-trips through JSON the way hosts send it.
  assert.deepEqual(JSON.parse(JSON.stringify(b.sprints)), b.sprints);
});

test("loadBoard: sprints on with no sprint files and no active sprint", async () => {
  const { tasks } = workspace('{"sprint":{}}');
  const b = await loadBoard(tasks);
  assert.deepEqual(b.sprints, { config: sprintDefaults(), list: [] });
});
