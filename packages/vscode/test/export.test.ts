import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateMessage, validateReportRequest, type ReportRequest, type ValidationContext } from "../src/protocol.ts";
import { filterToReportRequest, peopleChoices, reportFileName } from "../src/report-options.ts";
import { buildReportFile } from "../src/report-request.ts";

const ctx: ValidationContext = { tasksDir: join("/", "ws", "Tasks"), columns: ["1-backlog"], views: ["board"] };
const good: ReportRequest = { from: "2026-10-01", to: "2026-10-31", dateField: "done", people: ["sam-lee"], includeSubtasks: true };

test("filter -> report request: active period and field carry over", () => {
  const r = filterToReportRequest({ range: { from: "2026-09-01", to: "2026-09-30", field: "due" }, people: ["a", "a", "b"] }, "2026-10-30");
  assert.deepEqual(r, { from: "2026-09-01", to: "2026-09-30", dateField: "due", people: ["a", "b"], includeSubtasks: true });
  assert.equal(filterToReportRequest({ range: { from: "2026-09-01", field: "updated" } }, "2026-10-30").dateField, "updated");
});

test("filter -> report request: no active period defaults to done this month", () => {
  assert.deepEqual(filterToReportRequest({}, "2026-10-30"), { from: "2026-10-01", to: "2026-10-31", dateField: "done", people: [], includeSubtasks: true });
  assert.equal(filterToReportRequest({ range: { field: "due" } }, "2026-02-10").to, "2026-02-28");
  assert.equal(filterToReportRequest({ range: { from: "garbage", to: "" , field: "due" } }, "2026-10-30").dateField, "done");
});

test("people choices: board people first, unknown owners keyed like the report, no emails", () => {
  const board = { people: [{ id: "sam-lee", name: "Sam Lee", github: "samlee" }], columns: [{ tasks: [{ owner: "Sam Lee" }, { owner: "Zed Q" }, { owner: "a@b.co" }, { owner: "" }, {}] }] };
  assert.deepEqual(peopleChoices(board), [{ id: "sam-lee", label: "samlee" }, { id: "name:zed q", label: "Zed Q" }]);
  assert.deepEqual(peopleChoices(null), []);
});

test("protocol: accepts good options and drops extras", () => {
  const r = validateMessage({ type: "exportReport", options: { ...good, evil: 1 }, format: "csv" }, ctx);
  assert.deepEqual(r, { ok: true, message: { type: "exportReport", options: good, format: "csv" } });
  assert.equal(validateMessage({ type: "previewReport", options: good }, ctx).ok, true);
});

test("protocol: rejects bad dates, reversed range, bad enums, huge or hostile people", () => {
  const bad = (o: object) => assert.equal(validateReportRequest({ ...good, ...o }).ok, false, JSON.stringify(o));
  bad({ from: "2026-13-01" }); bad({ to: "2026-02-30" }); bad({ from: "10/01/2026" }); bad({ from: 5 }); bad({ from: "2026-11-01" });
  bad({ dateField: "created" }); bad({ includeSubtasks: "yes" });
  bad({ people: Array.from({ length: 201 }, (_, i) => `p${i}`) });
  bad({ people: ["a@b.co"] }); bad({ people: ["../x"] }); bad({ people: [5] }); bad({ people: "all" }); bad({ people: ["<script>"] });
  assert.equal(validateReportRequest(null).ok, false);
  assert.equal(validateMessage({ type: "exportReport", options: good, format: "pdf" }, ctx).ok, false);
  assert.equal(validateMessage({ type: "exportReport", options: good }, ctx).ok, false);
  assert.equal(validateMessage({ type: "previewReport" }, ctx).ok, false);
  assert.equal(validateReportRequest({ ...good, from: "", to: "" }).ok, true);
});

test("file name", () => {
  assert.equal(reportFileName(good, "html"), "gitask-report-2026-10-01_2026-10-31.html");
  assert.equal(reportFileName({ ...good, from: "" }, "markdown"), "gitask-report-start_2026-10-31.md");
});

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-export-"));
  const tasks = join(root, "Tasks");
  for (const f of ["2-todo", "4-testing", "5-done"]) mkdirSync(join(tasks, f), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  g("init", "-q", "-b", "main"); g("config", "user.email", "secret.person@example.com"); g("config", "user.name", "Sam Lee");
  const commit = (date: string, msg: string) => {
    g("add", "-A");
    execFileSync("git", ["commit", "-q", "-m", msg], { cwd: root, stdio: "pipe", env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z` } });
  };
  const put = (folder: string, id: string, owner: string, extra = "") =>
    writeFileSync(join(tasks, folder, `${id}.md`), `# ${id}\n\n- **Owner:** ${owner}\n- **Started / updated:** 2026-10-01 / 2026-10-05\n\n## Done when\n- [x] a\n${extra}`);
  return { root, tasks, g, commit, put, move: (id: string) => renameSync(join(tasks, "4-testing", `${id}.md`), join(tasks, "5-done", `${id}.md`)) };
}

test("handler on a temp repo: several people, filtering, empty period, no email anywhere", async () => {
  const r = repo();
  r.put("4-testing", "A-one", "Sam Lee"); r.put("4-testing", "A-two", "ann@corp.example.com"); r.put("4-testing", "A-three", "Ann Roe <ann.roe@corp.example.com>");
  r.put("2-todo", "A-open", "Sam Lee");
  r.commit("2026-10-02", "init");
  for (const id of ["A-one", "A-two", "A-three"]) r.move(id);
  r.commit("2026-10-10", "done");
  writeFileSync(join(r.tasks, "gitask.json"), JSON.stringify({ people: [{ id: "sam-lee", name: "Sam Lee", github: "samlee" }] }));

  const all: ReportRequest = { ...good, people: [] };
  for (const fmt of ["html", "markdown", "csv"] as const) {
    const f = await buildReportFile(r.tasks, all, fmt);
    assert.match(f.name, /^gitask-report-2026-10-01_2026-10-31\./);
    assert.match(f.content, /samlee/);
    assert.doesNotMatch(f.content, /[\w.+-]+@[\w-]+\.[\w.]+/, `${fmt} must contain no email address`);
    assert.doesNotMatch(f.content, /secret\.person|corp\.example/);
  }
  const csv = (await buildReportFile(r.tasks, { ...all, people: ["sam-lee"] }, "csv")).content;
  assert.match(csv, /A-one/); assert.doesNotMatch(csv, /A-three/);
  const empty = await buildReportFile(r.tasks, { ...all, from: "2025-01-01", to: "2025-01-31" }, "html");
  assert.match(empty.content, /No tasks were completed/);
});
