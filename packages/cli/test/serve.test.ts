import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request, type IncomingMessage } from "node:http";
import { startServer, MAX_BODY_BYTES, type RunningServer } from "../src/serve.ts";

const TASK = "# Core-demo\n\n- **Repo:** GITASK\n- **Owner:** Sam\n- **Tier:** T2 · x\n- **Claimed by:** none\n- **Started / updated:** 2026-01-01 / 2026-01-01\n\n## Goal\nDemo.\n";

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "gitask-serve-"));
  const tasks = join(root, "Tasks");
  for (const d of ["1-backlog", "2-todo", "3-in-progress"]) mkdirSync(join(tasks, d), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "Core-demo.md"), TASK);
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, tasks, g };
}

const servers: RunningServer[] = [];
after(async () => { for (const s of servers) await s.close(); });
async function boot(tasks: string, extra: Record<string, unknown> = {}) {
  const s = await startServer({ dir: tasks, port: 0, assets: { js: "console.log(1)", css: "a{}" }, debounceMs: 20, ...extra });
  servers.push(s);
  return s;
}

interface Res { status: number; headers: IncomingMessage["headers"]; body: string }
function call(s: RunningServer, method: string, path: string, o: { token?: string | null; headers?: Record<string, string>; body?: string } = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Host: `127.0.0.1:${s.port}`, ...o.headers };
    if (o.token !== null) headers["X-Gitask-Token"] = o.token ?? s.token;
    const r = request({ host: "127.0.0.1", port: s.port, method, path, headers }, (res) => {
      let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    r.on("error", reject);
    r.end(o.body);
  });
}
const post = (s: RunningServer, msg: unknown, h: Record<string, string> = {}) =>
  call(s, "POST", "/api/message", { headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(msg) });

test("token is 64 hex chars and the url carries it", async () => {
  const { tasks } = workspace();
  const s = await boot(tasks);
  assert.match(s.token, /^[0-9a-f]{64}$/);
  assert.equal(s.url, `http://127.0.0.1:${s.port}/?token=${s.token}`);
});

test("missing or wrong token is 401", async () => {
  const s = await boot(workspace().tasks);
  assert.equal((await call(s, "GET", "/api/board", { token: null })).status, 401);
  assert.equal((await call(s, "GET", "/api/board", { token: "nope" })).status, 401);
  const flipped = s.token.slice(0, -1) + (s.token.endsWith("0") ? "1" : "0");
  assert.equal((await call(s, "GET", "/api/board", { token: flipped })).status, 401);
  const noTok = await call(s, "POST", "/api/message", { token: null, headers: { "Content-Type": "application/json" }, body: '{"type":"ready"}' });
  assert.equal(noTok.status, 401);
  assert.equal((await call(s, "GET", `/api/events?token=bad`, { token: null })).status, 401);
  assert.equal((await call(s, "GET", "/api/board")).status, 200);
});

test("bad Host (DNS rebinding) and bad Origin are 403", async () => {
  const s = await boot(workspace().tasks);
  assert.equal((await call(s, "GET", "/api/board", { headers: { Host: "evil.example:80" } })).status, 403);
  assert.equal((await call(s, "GET", "/", { headers: { Host: "evil.example" } })).status, 403);
  assert.equal((await call(s, "GET", "/api/board", { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await post(s, { type: "ready" }, { Origin: "http://evil.example" })).status, 403);
  assert.equal((await call(s, "GET", "/api/board", { headers: { Origin: `http://127.0.0.1:${s.port}` } })).status, 200);
  assert.equal((await call(s, "GET", "/api/board", { headers: { Host: `localhost:${s.port}` } })).status, 200);
});

test("static: index has a strict CSP, assets are fixed, traversal is 404", async () => {
  const s = await boot(workspace().tasks);
  const i = await call(s, "GET", "/", { token: null });
  assert.equal(i.status, 200);
  const csp = String(i.headers["content-security-policy"]);
  assert.match(csp, /default-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval|script-src[^;]*unsafe-inline|\*/);
  assert.match(i.body, /nonce="/);
  assert.equal((await call(s, "GET", "/ui.js", { token: null })).headers["content-type"], "text/javascript; charset=utf-8");
  for (const p of ["/../../etc/passwd", "/%2e%2e/%2e%2e/etc/passwd", "/ui.js/../../package.json", "/api", "/package.json"]) {
    const r = await call(s, "GET", p, { token: null });
    assert.ok(r.status === 404 || r.status === 401, `${p} -> ${r.status}`);
    assert.doesNotMatch(r.body, /root:|"name"/);
  }
});

test("paths outside Tasks are rejected (message and taskBody)", async () => {
  const { tasks, root } = workspace();
  const s = await boot(tasks);
  for (const path of [join(root, "CHANGELOG.md"), join(tasks, "2-todo", "..", "..", "x.md"), "/etc/passwd", "../x.md", join(tasks, "9-nope", "a.md")]) {
    assert.equal((await post(s, { type: "move", path, to: "3-in-progress" })).status, 400, path);
    assert.equal((await post(s, { type: "deleteTask", path })).status, 400, path);
    assert.equal((await call(s, "GET", `/api/taskBody?path=${encodeURIComponent(path)}`)).status, 400, path);
  }
  assert.ok(existsSync(join(tasks, "2-todo", "Core-demo.md")));
});

test("malformed JSON, wrong content-type, unknown type", async () => {
  const s = await boot(workspace().tasks);
  const h = { "Content-Type": "application/json" };
  assert.equal((await call(s, "POST", "/api/message", { headers: h, body: "{nope" })).status, 400);
  assert.equal((await call(s, "POST", "/api/message", { headers: { "Content-Type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await post(s, { type: "exec", cmd: "rm" })).status, 400);
  assert.equal((await post(s, [1, 2])).status, 400);
});

test("oversized body is capped with 413", async () => {
  const s = await boot(workspace().tasks);
  const r = await call(s, "POST", "/api/message", { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ready", pad: "x".repeat(MAX_BODY_BYTES + 10) }) }).catch((e) => ({ status: 413, err: e }));
  assert.equal(r.status, 413);
});

test("port in use gives a clear error", async () => {
  const s = await boot(workspace().tasks);
  await assert.rejects(startServer({ dir: workspace().tasks, port: s.port, assets: { js: "", css: "" } }), /already in use/);
});

test("a real move over HTTP commits in the temp repo and pushes to two SSE clients", async () => {
  const { tasks, g } = workspace();
  const s = await boot(tasks);
  const frames: string[][] = [[], []];
  const reqs = [0, 1].map((n) => {
    const r = request({ host: "127.0.0.1", port: s.port, path: `/api/events?token=${s.token}`, headers: { Host: `127.0.0.1:${s.port}` } }, (res) => {
      assert.equal(res.headers["content-type"], "text/event-stream; charset=utf-8");
      res.setEncoding("utf8"); res.on("data", (c: string) => frames[n].push(c));
    });
    r.end();
    return r;
  });
  const until = async (f: () => boolean) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 50)); assert.ok(f(), "timed out"); };
  await until(() => frames.every((f) => f.join("").includes("event: board")));
  const board = JSON.parse((await call(s, "GET", "/api/board")).body);
  const path = board.columns.find((c: { id: string }) => c.id === "2-todo").tasks[0].path;
  const r = await post(s, { type: "move", path, to: "3-in-progress" });
  assert.equal(r.status, 200);
  assert.ok(existsSync(join(tasks, "3-in-progress", "Core-demo.md")));
  assert.match(g("log", "-1", "--format=%s"), /\S/);
  assert.notEqual(g("log", "--format=%H").trim().split("\n").length, 1);
  await until(() => frames.every((f) => f.join("").includes('"id":"3-in-progress"') && /3-in-progress[^]*Core-demo/.test(f.join("").split("event: board").pop()!)));
  for (const q of reqs) q.destroy();
  assert.equal(g("status", "--porcelain", "Tasks").trim(), "");
});

test("readTask returns the body over GET /api/taskBody", async () => {
  const { tasks } = workspace();
  const s = await boot(tasks);
  const r = await call(s, "GET", `/api/taskBody?path=${encodeURIComponent(join(tasks, "2-todo", "Core-demo.md"))}`);
  assert.equal(r.status, 200);
  assert.match(JSON.parse(r.body).text, /# Core-demo/);
});

test("report download: needs the token, validates the request, never leaks an email", async () => {
  const { tasks } = workspace();
  const s = await boot(tasks);
  const body = JSON.stringify({ type: "exportReport", format: "csv", options: { from: "2020-01-01", to: "2030-12-31", dateField: "updated", includeSubtasks: true, people: [] } });
  const h = { "Content-Type": "application/json" };
  assert.equal((await call(s, "POST", "/api/report", { token: null, headers: h, body })).status, 401);
  const ok = await call(s, "POST", "/api/report", { headers: h, body });
  assert.equal(ok.status, 200);
  assert.match(String(ok.headers["content-disposition"]), /^attachment; filename="gitask-report-[\w.-]+\.csv"$/);
  assert.doesNotMatch(ok.body, /@/);
  const bad = await call(s, "POST", "/api/report", { headers: h, body: JSON.stringify({ type: "exportReport", format: "pdf", options: {} }) });
  assert.equal(bad.status, 400);
  const wrongType = await call(s, "POST", "/api/report", { headers: h, body: '{"type":"ready"}' });
  assert.equal(wrongType.status, 400);
});

test("favicon: public, right content types, fixed map, CSP unchanged", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const s = await boot(workspace().tasks, { assets: { js: "1", css: "a{}", icon: { svg: "<svg/>", png } } });
  const html = await call(s, "GET", "/", { token: null });
  assert.match(html.body, /rel="icon"[^>]*href="\/favicon\.svg"/);
  assert.match(String(html.headers["content-security-policy"]), /img-src 'self' data:/);
  const svg = await call(s, "GET", "/favicon.svg", { token: null });
  assert.equal(svg.status, 200);
  assert.equal(svg.headers["content-type"], "image/svg+xml; charset=utf-8");
  assert.equal(svg.body, "<svg/>");
  const p = await call(s, "GET", "/favicon.png", { token: null });
  assert.equal(p.status, 200);
  assert.equal(p.headers["content-type"], "image/png");
  assert.equal((await call(s, "GET", "/api/board", { token: null })).status, 401); // only the icon is public
  for (const q of ["/favicon.svg/../../package.json", "/%2e%2e/favicon.svg/x", "/favicon.svgx", "/favicon.png/x"]) {
    const r = await call(s, "GET", q, { token: null });
    assert.ok(r.status === 404 || r.status === 401, `${q} -> ${r.status}`);
  }
});
