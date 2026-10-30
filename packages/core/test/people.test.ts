import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listPeople, syncPeople, setOwner, setOwnerField, parsePeople, setColumnColor, loadBoard, readColors } from "../src/index.ts";

const task = (owner?: string) =>
  `# A-one\n\n${owner === undefined ? "" : `- **Owner:** ${owner}\n`}- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Goal\nx\n\n## Done when\n- [ ] a\n`;

function repo(commits = true) {
  const root = mkdtempSync(join(tmpdir(), "gitask-people-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "A-one.md"), task("Sam"));
  writeFileSync(join(tasks, "2-todo", "A-none.md"), task());
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  const commit = (name: string, email: string, file: string) => {
    writeFileSync(join(root, file), file);
    g("add", "--", file);
    g("-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m", file);
  };
  if (commits) g("add", "-A"), g("commit", "-q", "-m", "init");
  return { root, tasks, g, commit };
}

test("two emails, one person via .mailmap; most commits first", async () => {
  const { root, commit } = repo(false);
  commit("Sam Lee", "sam@home.io", "a");
  commit("sam", "sam@work.io", "b");
  commit("Ann Roe", "ann@x.io", "c");
  writeFileSync(join(root, ".mailmap"), "Sam Lee <sam@home.io> <sam@work.io>\nSam Lee <sam@home.io> sam <sam@work.io>\n");
  const people = await listPeople(root);
  assert.deepEqual(people, [{ id: "sam-lee", name: "Sam Lee" }, { id: "ann-roe", name: "Ann Roe" }]);
  assert.ok(!JSON.stringify(people).includes("@"));
});

test("bots are excluded", async () => {
  const { root, commit } = repo(false);
  commit("dependabot[bot]", "49699333+dependabot[bot]@users.noreply.github.com", "a");
  commit("Ann Roe", "ann@x.io", "b");
  assert.deepEqual((await listPeople(root)).map((p) => p.id), ["ann-roe"]);
});

test("no commits, no repo and missing dir give an empty list", async () => {
  const { root } = repo(false);
  assert.deepEqual(await listPeople(root), []);
  assert.deepEqual(await listPeople(mkdtempSync(join(tmpdir(), "gitask-nogit-"))), []);
  assert.deepEqual(await listPeople(join(root, "missing")), []);
});

test("github login comes from both noreply forms", async () => {
  const { root, commit } = repo(false);
  commit("Ann Roe", "12345+annroe@users.noreply.github.com", "a");
  commit("Bob Kim", "bobk@users.noreply.github.com", "b");
  commit("Bob Kim", "bob@real.io", "c");
  commit("Cy Dee", "cy@real.io", "d");
  const by = Object.fromEntries((await listPeople(root)).map((p) => [p.id, p.github]));
  assert.deepEqual(by, { "bob-kim": "bobk", "ann-roe": "annroe", "cy-dee": undefined });
});

test("syncPeople saves names only, keeps colours, hand edits win", async () => {
  const { root, tasks, g, commit } = repo();
  commit("Sam Lee", "sam@home.io", "a");
  commit("Ann Roe", "ann@users.noreply.github.com", "b");
  await setColumnColor(tasks, "2-todo", "#112233", { commit: false });
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ columns: { "2-todo": { color: "#112233" } }, people: [{ id: "sam-lee", name: "Samuel", role: "backend" }] }));
  g("add", "--", "Tasks/gitask.json");
  g("commit", "-q", "-m", "cfg");
  const people = await syncPeople(tasks);
  assert.deepEqual(people.map((p) => p.id), ["sam-lee", "t", "ann-roe"]);
  assert.deepEqual(people[0], { id: "sam-lee", name: "Samuel", role: "backend" });
  assert.equal(people[2].github, "ann");
  const text = readFileSync(join(tasks, "gitask.json"), "utf8");
  assert.ok(!text.includes("@"));
  assert.deepEqual(await readColors(tasks), { "2-todo": "#112233" });
  assert.deepEqual(parsePeople(text), people);
  assert.equal(g("status", "--porcelain", "--", "Tasks/gitask.json"), "");
  assert.match(g("log", "-1", "--format=%s"), /people/);
  assert.deepEqual(await syncPeople(tasks), people); // second run: nothing to change
  assert.equal(g("rev-list", "--count", "HEAD"), "5");
});

test("setColumnColor keeps people", async () => {
  const { tasks } = repo();
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ people: [{ id: "a", name: "A" }] }));
  await setColumnColor(tasks, "2-todo", "#aabbcc", { commit: false });
  assert.deepEqual(parsePeople(readFileSync(join(tasks, "gitask.json"), "utf8")), [{ id: "a", name: "A" }]);
});

test("assign and unassign rewrite the Owner line only and commit that path", async () => {
  const { tasks, g } = repo();
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ people: [{ id: "sam-lee", name: "Sam Lee" }] }));
  writeFileSync(join(tasks, "2-todo", "A-none.md"), task() + "dirty\n"); // other dirty file must not be swept in
  const board = await loadBoard(tasks);
  const t = board.columns[0].tasks.find((x) => x.id === "A-one")!;
  const before = readFileSync(t.path, "utf8");

  const r = await setOwner(t, "sam-lee");
  assert.equal(r.committed, true);
  assert.equal(readFileSync(t.path, "utf8"), before.replace("Owner:** Sam", "Owner:** Sam Lee"));
  assert.equal(g("show", "--name-only", "--format=", "HEAD"), "Tasks/2-todo/A-one.md");
  assert.match(g("status", "--porcelain"), /A-none\.md/);

  const u = await setOwner(t, null);
  assert.equal(u.owner, "");
  assert.equal(readFileSync(t.path, "utf8"), before.replace("Owner:** Sam", "Owner:**"));
  assert.equal(g("status", "--porcelain", "--", "Tasks/2-todo/A-one.md"), "");
});

test("owner line missing: assign inserts it, unassign is a no-op", async () => {
  const { tasks, g } = repo();
  const t = (await loadBoard(tasks)).columns[0].tasks.find((x) => x.id === "A-none")!;
  const u = await setOwner(t, null);
  assert.equal(u.committed, false);
  assert.equal(readFileSync(t.path, "utf8"), task());
  const r = await setOwner(t, "ann-roe"); // not saved: id is written
  assert.equal(readFileSync(t.path, "utf8"), task("ann-roe"));
  assert.equal(r.committed, true);
  assert.equal(g("show", "--name-only", "--format=", "HEAD"), "Tasks/2-todo/A-none.md");
});

test("setOwnerField keeps CRLF and rejects nothing else", () => {
  const crlf = task("Sam").replaceAll("\n", "\r\n");
  assert.equal(setOwnerField(crlf, "Ann"), crlf.replace("Sam", "Ann"));
  assert.equal(setOwnerField(task("Sam"), "A\nB"), task("A B"));
});

test("addPerson adds a slug id, keeps other keys, dedupes and rejects empty names", async () => {
  const { tasks } = repo();
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ columns: { "2-todo": "#112233" } }));
  const { addPerson } = await import("../src/index.ts");
  const p = await addPerson(tasks, "  Sam   Lee ", { commit: false });
  assert.deepEqual(p, [{ id: "sam-lee", name: "Sam Lee" }]);
  assert.equal((await addPerson(tasks, "sam lee", { commit: false })).length, 1);
  assert.equal(JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8")).columns["2-todo"], "#112233");
  await assert.rejects(() => addPerson(tasks, "!!!"));
});
