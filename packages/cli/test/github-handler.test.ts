import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/handler.ts";

const TOKEN = "ghp_SECRETTOKEN123";
const TASK = "# One\n\n- **Owner:** Sam Lee\n- **Started / updated:** 2026-10-02 / 2026-10-05\n\n## Goal\nx\n\n## Sub-tasks\n- [ ] first @ann-roe\n";

function repo(github = true) {
  const root = mkdtempSync(join(tmpdir(), "gitask-ghh-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "A-one.md"), TASK);
  const cfg: Record<string, unknown> = { people: [{ id: "sam-lee", name: "Sam Lee", github: "samlee" }, { id: "ann-roe", name: "Ann Roe", github: "annroe" }] };
  if (github) cfg.github = { repo: "acme/app" };
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify(cfg));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks"); g("commit", "-q", "-m", "init");
  return tasks;
}

const servers: Server[] = [];
after(() => { for (const s of servers) s.close(); });
async function fake() {
  const reqs: { method: string; url: string; auth?: string }[] = [];
  let n = 0;
  const server = createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    reqs.push({ method: req.method!, url: req.url!, auth: req.headers.authorization });
    const send = (s: number, d: unknown) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(d)); };
    if (req.method === "POST" && req.url === "/repos/acme/app/issues") { n++; return send(201, { id: 9000 + n, number: n, title: "t", state: "open", assignees: [], html_url: `https://github.com/acme/app/issues/${n}` }); }
    if (/\/sub_issues$/.test(req.url!)) return send(req.method === "GET" ? 200 : 201, req.method === "GET" ? [] : { id: 1 });
    if (/\/issues\/\d+$/.test(req.url!)) return send(200, { id: 1, number: 1, state: "open", assignees: [] });
    send(404, { message: "Not Found" });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  servers.push(server);
  return { reqs, base: `http://127.0.0.1:${(server.address() as { port: number }).port}` };
}

test("board payload carries github {repo} only when configured", async () => {
  assert.deepEqual((await createHandler({ dir: repo() }).board() as { github?: unknown }).github, { repo: "acme/app" });
  assert.equal((await createHandler({ dir: repo(false) }).board() as { github?: unknown }).github, undefined);
});

test("githubPlan is a dry run: no network, no token, no file written, no paths or bodies in the reply", async () => {
  const f = await fake();
  const dir = repo();
  const before = readFileSync(join(dir, "2-todo", "A-one.md"), "utf8");
  const h = createHandler({ dir, env: { GITHUB_TOKEN: TOKEN }, github: { baseUrl: f.base } });
  const r = await h.handle({ type: "githubPlan" });
  assert.equal(r.reply?.type, "githubPlanResult");
  const plan = (r.reply as { plan: { issues: { action: string; assignees: string[] }[]; notify: { login: string }[] } }).plan;
  assert.equal(plan.issues[0].action, "create");
  assert.deepEqual(plan.issues[0].assignees, ["samlee"]);
  assert.deepEqual(plan.notify.map((x) => x.login).sort(), ["annroe", "samlee"]);
  const text = JSON.stringify(r);
  assert.ok(!text.includes(TOKEN) && !text.includes(dir) && !text.includes('"body"'));
  assert.equal(f.reqs.length, 0);
  assert.equal(readFileSync(join(dir, "2-todo", "A-one.md"), "utf8"), before);
});

test("githubSync applies with the env token; the token is only in the Authorization header, never in the reply", async () => {
  const f = await fake();
  const dir = repo();
  const h = createHandler({ dir, env: { GITHUB_TOKEN: TOKEN }, github: { baseUrl: f.base } });
  // a hostile browser tries to smuggle its own token and plan: both are dropped by validation
  const r = await h.handle({ type: "githubSync", token: "ghp_EVIL", plan: { repo: "evil/x" } });
  assert.equal(r.status, 200);
  assert.equal(r.reply?.type, "githubSyncResult");
  assert.equal((r.reply as { ok: boolean }).ok, true);
  assert.ok(f.reqs.length > 0 && f.reqs.every((q) => q.auth === `Bearer ${TOKEN}` || q.auth === `token ${TOKEN}`));
  assert.ok(f.reqs.every((q) => q.url.startsWith("/repos/acme/app")));
  assert.ok(!JSON.stringify(r).includes(TOKEN) && !JSON.stringify(r).includes("EVIL"));
  assert.match(readFileSync(join(dir, "2-todo", "A-one.md"), "utf8"), /\*\*Issue:\*\* #1/);
});

test("githubSync without GITHUB_TOKEN says how to set it and sends nothing", async () => {
  const f = await fake();
  const h = createHandler({ dir: repo(), env: {}, github: { baseUrl: f.base } });
  const r = await h.handle({ type: "githubSync" });
  const m = r.reply as { ok: boolean; error: string };
  assert.equal(m.ok, false);
  assert.match(m.error, /GITHUB_TOKEN/);
  assert.equal(f.reqs.length, 0);
});

test("githubSync failure from GitHub never leaks the token", async () => {
  const dir = repo();
  const h = createHandler({ dir, env: { GITHUB_TOKEN: TOKEN }, github: { fetch: async () => { throw new Error(`socket closed for Bearer ${TOKEN}`); } } });
  const r = await h.handle({ type: "githubSync" });
  assert.equal((r.reply as { ok: boolean }).ok, false);
  assert.ok(!JSON.stringify(r).includes(TOKEN));
});

test("no github config: plan and sync answer with an error", async () => {
  const h = createHandler({ dir: repo(false), env: { GITHUB_TOKEN: TOKEN } });
  assert.ok((await h.handle({ type: "githubPlan" })).reply && (await h.handle({ type: "githubPlan" })).reply!.type === "githubPlanResult");
  const s = await h.handle({ type: "githubSync" });
  assert.equal((s.reply as { ok: boolean }).ok, false);
});
