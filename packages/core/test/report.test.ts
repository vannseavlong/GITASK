import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReport, renderHtml, renderMarkdown, renderCsv, csvCell, loadBoard } from "../src/index.ts";
import type { Person } from "../src/index.ts";

const FOLDERS = ["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done", "6-deploy"];

function body(title: string, f: { owner?: string; started?: string; updated?: string; due?: string; tier?: string; subs?: string[] } = {}) {
  const lines = [`# ${title}`, ""];
  if (f.owner !== undefined) lines.push(`- **Owner:** ${f.owner}`);
  if (f.tier) lines.push(`- **Tier:** ${f.tier}`);
  if (f.due) lines.push(`- **Due:** ${f.due}`);
  lines.push(`- **Started / updated:** ${f.started ?? "2026-01-01"} / ${f.updated ?? f.started ?? "2026-01-01"}`, "", "## Goal", "x", "", "## Done when", "- [x] a", "");
  if (f.subs) lines.push("## Sub-tasks", ...f.subs, "");
  return lines.join("\n");
}

function repo(git = true) {
  const root = mkdtempSync(join(tmpdir(), "gitask-report-"));
  const tasks = join(root, "Tasks");
  for (const f of FOLDERS) mkdirSync(join(tasks, f), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  if (git) {
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
  }
  const commit = (date: string, msg: string) => {
    g("add", "-A");
    execFileSync("git", ["commit", "-q", "-m", msg], { cwd: root, stdio: "pipe", env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z` } });
  };
  const put = (folder: string, id: string, text: string) => writeFileSync(join(tasks, folder, `${id}.md`), text);
  const move = (id: string, from: string, to: string) => renameSync(join(tasks, from, `${id}.md`), join(tasks, to, `${id}.md`));
  return { root, tasks, g, commit, put, move };
}

const people: Person[] = [
  { id: "sam-lee", name: "Sam Lee", github: "samlee" },
  { id: "ann-roe", name: "Ann Roe" },
];

test("empty period: no tasks, no people, still a valid report", async () => {
  const r = repo();
  r.put("2-todo", "A-open", body("Open", { owner: "Sam Lee" }));
  r.commit("2026-02-01", "init");
  const rep = await buildReport(await loadBoard(r.tasks), { from: "2026-03-01", to: "2026-03-31", people, includeSubtasks: true });
  assert.equal(rep.summary.tasksDone, 0);
  assert.deepEqual(rep.people, []);
  assert.match(renderHtml(rep), /No tasks were completed/);
  assert.match(renderMarkdown(rep), /No tasks were completed/);
  assert.equal(renderCsv(rep).trim().split("\r\n").length, 1);
});

test("one person: git move date, on time vs late, average days, tier mix, GitHub name", async () => {
  const r = repo();
  r.put("4-testing", "A-one", body("One", { owner: "Sam Lee", started: "2026-01-01", due: "2026-01-20", tier: "T2 · new feature" }));
  r.put("4-testing", "A-two", body("Two", { owner: "samlee", started: "2026-01-05", due: "2026-01-10", tier: "T1" }));
  r.commit("2026-01-02", "init");
  r.move("A-one", "4-testing", "5-done");
  r.commit("2026-01-11", "move one");
  r.move("A-two", "4-testing", "6-deploy");
  r.commit("2026-01-15", "move two");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true, repo: "demo" });
  assert.equal(rep.people.length, 1);
  const p = rep.people[0];
  assert.equal(p.name, "samlee");
  assert.equal(p.tasksDone, 2);
  assert.equal(p.onTime, 1);
  assert.equal(p.late, 1);
  assert.equal(p.avgDays, 10);
  assert.deepEqual(p.tiers, { T1: 1, T2: 1 });
  const one = rep.tasks.find((t) => t.id === "A-one")!;
  assert.equal(one.doneDate, "2026-01-11");
  assert.equal(one.doneSource, "git");
  assert.equal(one.days, 10);
});

test("many people, sub-tasks credited to assignees, unassigned bucket, unknown owner", async () => {
  const r = repo();
  r.put("5-done", "A-a", body("A", { owner: "Sam Lee", subs: ["- [x] api @ann-roe #backend", "- [x] ui @sam-lee #frontend", "- [ ] open @sam-lee", "- [x] loose"] }));
  r.put("5-done", "A-b", body("B", { owner: "Ann Roe" }));
  r.put("5-done", "A-c", body("C"));
  r.put("5-done", "A-d", body("D", { owner: "Zed Quux <zed@secret.io>" }));
  r.commit("2026-01-02", "init");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true });
  const by = Object.fromEntries(rep.people.map((p) => [p.name, p]));
  assert.equal(by["samlee"].tasksDone, 1);
  assert.equal(by["samlee"].subtasksDone, 1);
  assert.equal(by["Ann Roe"].tasksDone, 1);
  assert.equal(by["Ann Roe"].subtasksDone, 1);
  assert.equal(by["Unassigned"].tasksDone, 1);
  assert.equal(by["Unassigned"].subtasksDone, 1);
  assert.equal(by["Zed Quux"].tasksDone, 1);
  assert.equal(rep.people.at(-1)!.name, "Unassigned");
  assert.equal(rep.summary.unassignedTasks, 1);
  assert.equal(rep.summary.subtasksDone, 3);
  const noSubs = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: false });
  assert.equal(noSubs.summary.subtasksDone, 0);
  for (const out of [renderHtml(rep), renderMarkdown(rep), renderCsv(rep)]) {
    assert.ok(!out.includes("secret.io") && !out.includes("zed@"));
  }
  const only = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true, only: ["ann-roe"] });
  assert.deepEqual(only.people.map((p) => p.name), ["Ann Roe"]);
  assert.equal(only.tasks.length, 2);
});

test("task moved out and back: done date is the last move in; a move between done and deploy is not", async () => {
  const r = repo();
  r.put("3-in-progress", "A-x", body("X", { owner: "Sam Lee" }));
  r.commit("2026-01-02", "init");
  r.move("A-x", "3-in-progress", "5-done");
  r.commit("2026-01-10", "done");
  r.move("A-x", "5-done", "3-in-progress");
  r.commit("2026-01-12", "reopen");
  r.move("A-x", "3-in-progress", "5-done");
  r.commit("2026-01-20", "done again");
  r.move("A-x", "5-done", "6-deploy");
  r.commit("2026-01-25", "deploy");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true });
  assert.equal(rep.tasks[0].doneDate, "2026-01-20");
  assert.equal(rep.summary.tasksDone, 1);
  const jan = await buildReport(await loadBoard(r.tasks), { from: "2026-01-01", to: "2026-01-15", people, includeSubtasks: true });
  assert.equal(jan.summary.tasksDone, 0);
});

test("no git history: falls back to the updated date and says so; undated tasks are noted", async () => {
  const r = repo(false);
  r.put("5-done", "A-a", body("A", { owner: "Sam Lee", started: "2026-02-01", updated: "2026-02-09" }));
  r.put("5-done", "A-b", body("B", { owner: "Sam Lee" }).replace(/- \*\*Started.*\n/, ""));
  const board = await loadBoard(r.tasks);
  const rep = await buildReport(board, { people, includeSubtasks: true });
  const a = rep.tasks.find((t) => t.id === "A-a")!;
  assert.equal(a.doneDate, "2026-02-09");
  assert.equal(a.doneSource, "updated");
  assert.equal(rep.tasks.find((t) => t.id === "A-b")!.doneSource, "none");
  assert.equal(rep.summary.fromUpdated, 1);
  assert.equal(rep.summary.undated, 1);
  // The report shows the date but no longer says where it came from.
  const html = renderHtml(rep);
  assert.ok(html.includes("2026-02-09"));
  assert.ok(!/source|updated field|git/i.test(html.replace(/<style>[\s\S]*<\/style>/, "")));
  // With a period, the undated task is out, same as the board filter.
  const ranged = await buildReport(board, { from: "2026-02-01", people, includeSubtasks: true });
  assert.deepEqual(ranged.tasks.map((t) => t.id), ["A-a"]);
});

test("open-ended ranges are inclusive and match the board filter on due / updated", async () => {
  const r = repo(false);
  r.put("5-done", "A-a", body("A", { owner: "Sam Lee", due: "2026-03-10", updated: "2026-03-05" }));
  r.put("5-done", "A-b", body("B", { owner: "Sam Lee", due: "2026-04-10", updated: "2026-04-05" }));
  const board = await loadBoard(r.tasks);
  const ids = async (o: object) => (await buildReport(board, { includeSubtasks: false, ...o })).tasks.map((t) => t.id);
  assert.deepEqual(await ids({ from: "2026-03-05" }), ["A-a", "A-b"]);
  assert.deepEqual(await ids({ to: "2026-03-05" }), ["A-a"]);
  assert.deepEqual(await ids({ from: "2026-04-05", to: "2026-04-05" }), ["A-b"]);
  assert.deepEqual(await ids({ from: "garbage", to: "2026-13-40" }), ["A-a", "A-b"]);
  assert.deepEqual(await ids({ dateField: "due", to: "2026-03-10" }), ["A-a"]);
  assert.deepEqual(await ids({ dateField: "updated", from: "2026-04-01" }), ["A-b"]);
});

test("a title with <script> is escaped everywhere; HTML has no script or network", async () => {
  const r = repo();
  r.put("5-done", "A-x", body(`<script>alert(1)</script> & "q"`, { owner: "<img src=x onerror=alert(1)>", subs: ["- [x] <b>bold</b> @sam-lee"] }));
  r.commit("2026-01-02", "init");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true });
  const html = renderHtml(rep);
  assert.ok(!html.includes("<script"));
  assert.ok(!/<img|<b>bold/.test(html));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;"));
  assert.ok(!/https?:\/\//.test(html));
  assert.ok(!/<link|<iframe|<img/.test(html));
  const md = renderMarkdown(rep);
  assert.ok(!md.includes("<script") && !md.includes("<b>"));
});

test("CSV: formula prefixes are defused, quotes doubled, commas and newlines safe", async () => {
  assert.equal(csvCell("=1+1"), `"'=1+1"`);
  assert.equal(csvCell("+cmd"), `"'+cmd"`);
  assert.equal(csvCell("-2"), `"'-2"`);
  assert.equal(csvCell("@SUM(A1)"), `"'@SUM(A1)"`);
  assert.equal(csvCell('say "hi", ok'), `"say ""hi"", ok"`);
  assert.equal(csvCell(5), `"5"`);
  const r = repo();
  r.put("5-done", "A-x", body(`=HYPERLINK("http://e.x")`, { owner: "Sam Lee", subs: ["- [x] @bad? @sam-lee"] }));
  r.put("5-done", "A-y", body("+1,2", { owner: "@evil" }));
  r.commit("2026-01-02", "init");
  const csv = renderCsv(await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true }));
  assert.ok(csv.includes(`"'=HYPERLINK(""http://e.x"")"`));
  assert.ok(csv.includes(`"'+1,2"`));
  // Every cell that starts with a formula character must carry the leading apostrophe.
  for (const line of csv.split("\r\n").slice(1)) {
    for (const cell of line.match(/"(?:[^"]|"")*"/g) ?? []) assert.ok(!/^"[=+\-@\t\r]/.test(cell), `unneutralised cell ${cell}`);
  }
});

test("filter parity with the board's date filter rule", async () => {
  const { inReportRange } = await import("../src/index.ts");
  assert.equal(inReportRange("", "2026-01-01", ""), false);
  assert.equal(inReportRange("", "", ""), true);
  assert.equal(inReportRange("2026-01-01", "2026-01-01", "2026-01-01"), true);
  assert.equal(inReportRange("2026-01-02", "", "2026-01-01"), false);
});

test("done date is the move commit, not a later edit; born-in-done and non-ASCII names", async () => {
  const r = repo();
  r.put("3-in-progress", "A-e", body("E", { owner: "Sam Lee", due: "2026-01-10" }));
  r.commit("2026-01-02", "init");
  r.g("mv", "Tasks/3-in-progress/A-e.md", "Tasks/5-done/A-e.md");
  r.commit("2026-01-05", "done");
  r.put("5-done", "A-e", body("E", { owner: "Ann Roe", due: "2026-01-10" }));
  r.commit("2026-02-20", "owner changed later");
  const unique = (o: string) => `# Born\n\n- **Owner:** ${o}\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n${Array.from({ length: 30 }, (_, i) => `distinct line ${i * 7919}`).join("\n")}\n`;
  r.put("5-done", "A-born", unique("Sam Lee"));
  r.commit("2026-03-01", "born in done");
  r.put("5-done", "A-born", unique("Ann Roe"));
  r.commit("2026-03-09", "edit");
  r.put("3-in-progress", "A-é", body("Accent", { owner: "Sam Lee" }));
  r.commit("2026-04-01", "accent");
  r.g("mv", "Tasks/3-in-progress/A-é.md", "Tasks/5-done/A-é.md");
  r.commit("2026-04-05", "accent done");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: false });
  const by = (id: string) => rep.tasks.find((t) => t.id === id)!;
  assert.equal(by("A-e").doneDate, "2026-01-05");
  assert.equal(by("A-e").timeliness, "on-time");
  assert.equal(by("A-born").doneDate, "2026-03-01");
  assert.equal(by("A-é").doneDate, "2026-04-05");
  assert.equal(by("A-é").doneSource, "git");
});

test("a Due date with no usable done date is not reported as no-due", async () => {
  const r = repo(false);
  r.put("5-done", "A-n", body("N", { owner: "Sam Lee", due: "2026-03-10" }).replace(/- \*\*Started.*\n/, ""));
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: false });
  assert.equal(rep.tasks[0].doneSource, "none");
  assert.notEqual(rep.tasks[0].timeliness, "no-due");
  assert.equal(rep.summary.noDue, 0);
});

test("git-date note counts owned tasks only", async () => {
  const r = repo();
  r.put("3-in-progress", "A-a", body("A", { owner: "Sam Lee" }));
  r.put("3-in-progress", "A-b", body("B", { owner: "Ann Roe", subs: ["- [x] x @sam-lee"] }));
  r.commit("2026-01-02", "init");
  r.move("A-a", "3-in-progress", "5-done");
  r.move("A-b", "3-in-progress", "5-done");
  r.commit("2026-01-05", "done");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true, only: ["sam-lee"] });
  assert.equal(rep.tasks.length, 2);
  assert.ok(rep.notes.some((n) => n.startsWith("1 of 1 tasks used the git date")), rep.notes.join("\n"));
});

const textOf = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, "");

test("simple report: three tiles, one section per person, no noise (HTML and Markdown)", async () => {
  const r = repo();
  r.put("4-testing", "A-one", body("One", { owner: "Sam Lee", due: "2026-01-20", tier: "T2 · new feature", subs: ["- [x] api @ann-roe", "- [x] ui @sam-lee"] }));
  r.put("4-testing", "A-two", body("Two", { owner: "Sam Lee", due: "2026-01-05", tier: "T1" }));
  r.put("4-testing", "A-three", body("Three", { owner: "Ann Roe" }));
  r.put("4-testing", "A-four", body("Four", { owner: "Ann Roe" }));
  r.commit("2026-01-02", "init");
  for (const id of ["A-one", "A-two", "A-three"]) r.move(id, "4-testing", "5-done");
  r.commit("2026-01-11", "done");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true, repo: "demo", generated: "2026-02-01" });
  const html = textOf(renderHtml(rep));
  assert.equal((html.match(/class="tile"/g) ?? []).length, 3);
  for (const label of ["Tasks done", "Sub-tasks done", "People"]) assert.ok(html.includes(label));
  assert.equal((html.match(/<section class="person">/g) ?? []).length, 2);
  assert.ok(html.includes("2026-02-01") && html.includes("All time"));
  assert.ok(!html.includes("Four"), "open task must not appear");
  assert.ok(html.indexOf("samlee") < html.indexOf("Ann Roe") || html.indexOf("Ann Roe") < html.indexOf("samlee"));
  // Sub-tasks listed with their parent task, under the person who finished them.
  const ann = html.slice(html.indexOf("Ann Roe<span"));
  assert.ok(ann.includes("api") && ann.includes("(One)"));
  // Everything the owner called noise is gone.
  for (const gone of ["T1", "T2", "Tier", "git", "source", "Avg", "On time", "Data notes", "Timeliness", "A-one", "Tasks/"]) assert.ok(!html.includes(gone), `html still has ${gone}`);
  const md = renderMarkdown(rep);
  assert.ok(md.includes("## samlee") && md.includes("## Ann Roe"));
  assert.ok(md.includes("api") && md.includes("(One)"));
  for (const gone of ["T1", "T2", "Tier", "source", "Avg", "On time", "Data notes", "A-one"]) assert.ok(!md.includes(gone), `md still has ${gone}`);
});

test("late tag only for a task with a Due date done after it", async () => {
  const r = repo();
  r.put("4-testing", "A-late", body("Late one", { owner: "Sam Lee", due: "2026-01-05" }));
  r.put("4-testing", "A-ontime", body("Ontime one", { owner: "Sam Lee", due: "2026-01-30" }));
  r.put("4-testing", "A-nodue", body("Nodue one", { owner: "Sam Lee" }));
  r.commit("2026-01-02", "init");
  for (const id of ["A-late", "A-ontime", "A-nodue"]) r.move(id, "4-testing", "5-done");
  r.commit("2026-01-11", "done");
  const rep = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: false });
  const html = textOf(renderHtml(rep));
  assert.equal((html.match(/class="tag"/g) ?? []).length, 1);
  assert.match(html, /Late one<span class="tag">late<\/span>/);
  assert.ok(!/Ontime one<span/.test(html) && !/Nodue one<span/.test(html));
  const lateLines = renderMarkdown(rep).split("\n").filter((l) => l.includes("(late)"));
  assert.equal(lateLines.length, 1);
  assert.ok(lateLines[0].includes("Late one"));
  assert.ok(!html.includes("Sub-tasks done"));
});

test("Unassigned section only when non-empty; people filter shown in the muted line", async () => {
  const r = repo();
  r.put("5-done", "A-a", body("A", { owner: "Sam Lee" }));
  r.commit("2026-01-02", "init");
  const none = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true });
  assert.ok(!renderHtml(none).includes("Unassigned") && !renderMarkdown(none).includes("Unassigned"));
  assert.ok(!renderHtml(none).includes("People:"));
  r.put("5-done", "A-b", body("B"));
  r.commit("2026-01-03", "more");
  const some = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true });
  const html = renderHtml(some);
  assert.ok(html.includes("Unassigned<span"));
  assert.ok(html.indexOf("Unassigned<span") > html.indexOf("samlee<span"));
  assert.ok(renderMarkdown(some).includes("## Unassigned"));
  const only = await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true, only: ["sam-lee"], from: "2026-01-01", to: "2026-12-31" });
  assert.ok(renderHtml(only).includes("People: samlee"));
  assert.ok(!renderHtml(only).includes("Unassigned"));
});

test("CSV: flat columns, one row per task and per finished sub-task, no source/tier/timeliness", async () => {
  const r = repo();
  r.put("5-done", "A-a", body("Alpha", { owner: "Sam Lee", tier: "T2", due: "2026-01-01", subs: ["- [x] api @ann-roe", "- [x] ui @sam-lee", "- [ ] open @sam-lee"] }));
  r.put("5-done", "A-b", body("Beta", { owner: "Ann Roe" }));
  r.commit("2026-01-02", "init");
  const parse = (csv: string) => csv.trim().split("\r\n").map((l) => (l.match(/"(?:[^"]|"")*"/g) ?? []).map((c) => c.slice(1, -1).replace(/""/g, '"')));
  const withSubs = parse(renderCsv(await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true })));
  assert.deepEqual(withSubs[0], ["person", "task", "sub_task", "done_date", "sub_tasks_done"]);
  assert.equal(withSubs.length, 1 + 2 + 2);
  assert.ok(withSubs.some((c) => c[0] === "samlee" && c[1] === "Alpha" && c[2] === "" && c[3] === "2026-01-02" && c[4] === "2"));
  assert.ok(withSubs.some((c) => c[0] === "Ann Roe" && c[1] === "Alpha" && c[2] === "api" && c[3] === "2026-01-02" && c[4] === ""));
  assert.ok(withSubs.some((c) => c[0] === "Ann Roe" && c[1] === "Beta" && c[4] === "0"));
  const without = parse(renderCsv(await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: false })));
  assert.equal(without.length, 1 + 2);
  assert.ok(without.slice(1).every((c) => c[2] === "" && c[4] === ""));
  const flat = renderCsv(await buildReport(await loadBoard(r.tasks), { people, includeSubtasks: true }));
  for (const gone of ["T2", "git", "on-time", "late", "source", "tier"]) assert.ok(!flat.includes(gone), `csv has ${gone}`);
});
