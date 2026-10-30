import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { createHandler } from "../src/handler.ts";
import { startServer, type RunningServer } from "../src/serve.ts";
import { readPeople } from "gitask-core";

const TASK = "# One\n\n- **Owner:** Sam\n- **Started / updated:** 2026-10-02 / 2026-10-05\n\n## Goal\nx\n\n## Sub-tasks\n- [ ] first\n";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-hf-"));
  const tasks = join(root, "Tasks");
  for (const d of ["1-backlog", "2-todo"]) mkdirSync(join(tasks, d), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "A-one.md"), TASK);
  writeFileSync(join(tasks, "2-todo", "A-two.md"), TASK.replace("# One", "# Two"));
  writeFileSync(join(tasks, "1-backlog", ".gitkeep"), "");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks"); g("commit", "-q", "-m", "init");
  const as = (name: string, email: string, file: string) => {
    writeFileSync(join(root, file), file);
    g("add", "--", file);
    g("-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m", file);
  };
  as("Ann Roe", "ann@x.io", "a.txt"); as("Zed Quux", "zed@x.io", "b.txt"); as("Zed Quux", "zed@x.io", "c.txt");
  return { root, tasks, g, file: join(tasks, "2-todo", "A-one.md") };
}

test("deleteImpact reports recoverable / loses-local-edits / permanent with the shared wording", async () => {
  const { tasks, file } = repo();
  const h = createHandler({ dir: tasks });
  const ask = async () => (await h.handle({ type: "deleteImpact", path: file })).reply as { type: string; impact: string; detail: string };
  const clean = await ask();
  assert.equal(clean.type, "deleteImpact");
  assert.equal(clean.impact, "recoverable");
  assert.match(clean.detail, /restored from git history/);
  writeFileSync(file, TASK + "edit\n");
  const dirty = await ask();
  assert.equal(dirty.impact, "loses-local-edits");
  assert.match(dirty.detail, /uncommitted edits/);
  const off = await createHandler({ dir: tasks, commit: false }).handle({ type: "deleteImpact", path: file });
  assert.equal((off.reply as { impact: string }).impact, "permanent");
});

test("serve refuses deleteTask and deleteColumn that were not confirmed", async () => {
  const { tasks, file } = repo();
  const h = createHandler({ dir: tasks });
  const r = await h.handle({ type: "deleteTask", path: file });
  assert.equal(r.reply?.type, "error");
  assert.ok(existsSync(file), "file must still exist");
  const c = await h.handle({ type: "deleteColumn", column: "1-backlog" });
  assert.equal(c.reply?.type, "error");
  assert.ok(existsSync(join(tasks, "1-backlog")));
  const ok = await h.handle({ type: "deleteTask", path: file, confirmed: true });
  assert.equal(ok.reply, undefined);
  assert.ok(!existsSync(file));
  const okc = await h.handle({ type: "deleteColumn", column: "1-backlog", confirmed: true });
  assert.equal(okc.reply, undefined);
  assert.ok(!existsSync(join(tasks, "1-backlog")));
});

test("ready backfills ids and people once; owner pickers work on a fresh repo", async () => {
  const { tasks, g, file } = repo();
  assert.deepEqual(await readPeople(tasks), []);
  const h = createHandler({ dir: tasks });
  const r = await h.handle({ type: "ready" });
  assert.equal(r.changed, true);
  const people = await readPeople(tasks);
  assert.deepEqual(people.map((p) => p.id).sort(), ["ann-roe", "t", "zed-quux"]);
  assert.match(readFileSync(file, "utf8"), /\*\*ID:\*\* T-\d+/);
  const commits = g("log", "--format=%s").split("\n").length;
  await h.handle({ type: "ready" });
  assert.equal(g("log", "--format=%s").split("\n").length, commits, "second ready must not commit again");
  const set = await h.handle({ type: "setOwner", path: file, person: "zed-quux" });
  assert.equal(set.reply, undefined);
  assert.match(readFileSync(file, "utf8"), /\*\*Owner:\*\* Zed Quux/);
  assert.equal(g("status", "--porcelain", "--", file), "", "owner change is committed");
});

test("ready honours commit:false", async () => {
  const { tasks, g } = repo();
  const before = g("rev-list", "--count", "HEAD");
  await createHandler({ dir: tasks, commit: false }).handle({ type: "ready" });
  assert.equal(g("rev-list", "--count", "HEAD"), before);
  assert.ok((await readPeople(tasks)).length >= 2);
});

test("two parallel addSubtask calls both land", async () => {
  const { tasks, file } = repo();
  const h = createHandler({ dir: tasks, commit: false });
  const rs = await Promise.all(["alpha", "beta", "gamma", "delta"].map((text) => h.handle({ type: "addSubtask", path: file, text })));
  for (const r of rs) assert.equal(r.reply, undefined, JSON.stringify(r.reply));
  const body = readFileSync(file, "utf8");
  for (const t of ["alpha", "beta", "gamma", "delta"]) assert.match(body, new RegExp(`- \\[ \\] ${t}\\n`));
});

const servers: RunningServer[] = [];
after(async () => { for (const s of servers) await s.close(); });

test("over HTTP an unconfirmed delete leaves the file in place; ready via POST fills people", async () => {
  const { tasks, file } = repo();
  const s = await startServer({ dir: tasks, port: 0, assets: { js: "", css: "" }, debounceMs: 20 });
  servers.push(s);
  const post = (msg: unknown) => new Promise<{ status: number; body: string }>((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port: s.port, method: "POST", path: "/api/message", headers: { Host: `127.0.0.1:${s.port}`, "X-Gitask-Token": s.token, "Content-Type": "application/json" } }, (res) => {
      let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode!, body }));
    });
    r.on("error", reject); r.end(JSON.stringify(msg));
  });
  const d = await post({ type: "deleteTask", path: file });
  assert.match(d.body, /"type":"error"/);
  assert.ok(existsSync(file));
  await post({ type: "ready" });
  assert.ok((await readPeople(tasks)).length >= 2);
});
