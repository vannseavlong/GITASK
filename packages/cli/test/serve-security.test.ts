import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect, type Socket } from "node:net";
import { request } from "node:http";
import { startServer, hostWarning, type RunningServer } from "../src/serve.ts";
import { launcher, openBrowser } from "../src/open.ts";

function tasksDir() {
  const tasks = join(mkdtempSync(join(tmpdir(), "gitask-sec-")), "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  writeFileSync(join(tasks, "1-backlog", "A.md"), "# A\n");
  return tasks;
}
const servers: RunningServer[] = [];
const sockets: Socket[] = [];
after(async () => { for (const s of sockets) s.destroy(); for (const s of servers) await s.close(); });
async function boot(extra: Record<string, unknown> = {}) {
  const s = await startServer({ dir: tasksDir(), port: 0, assets: { js: "1", css: "a{}" }, debounceMs: 20, ...extra });
  servers.push(s);
  return s;
}
function http(s: RunningServer, method: string, path: string, o: { token?: string; body?: string; json?: boolean } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { Host: `127.0.0.1:${s.port}` };
    if (o.token) headers["X-Gitask-Token"] = o.token;
    if (o.json !== false && o.body !== undefined) headers["Content-Type"] = "application/json";
    const r = request({ host: "127.0.0.1", port: s.port, method, path, headers }, (res) => {
      let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode!, body }));
    });
    r.on("error", reject);
    r.end(o.body);
  });
}
const auth = (s: RunningServer, code: string) => http(s, "POST", "/api/auth", { body: JSON.stringify({ code }) });
const codeOf = (url: string) => new URL(url).searchParams.get("code")!;

test("openUrl carries a one-time code, never the token; the code buys the token exactly once", async () => {
  const s = await boot();
  const url = s.openUrl();
  assert.ok(!url.includes(s.token) && !url.includes("token="), url);
  assert.match(url, new RegExp(`^http://127\\.0\\.0\\.1:${s.port}/\\?code=[\\w-]+$`));
  const first = await auth(s, codeOf(url));
  assert.equal(first.status, 200);
  assert.equal(JSON.parse(first.body).token, s.token);
  assert.equal((await auth(s, codeOf(url))).status, 401); // spent
  assert.equal((await auth(s, "nope")).status, 401);
  assert.equal((await auth(s, "")).status, 401);
  assert.equal((await http(s, "POST", "/api/auth", { body: "{", })).status, 400);
  assert.notEqual(codeOf(s.openUrl()), codeOf(s.openUrl())); // every call issues a fresh code
  assert.equal(s.url, `http://127.0.0.1:${s.port}/?token=${s.token}`); // the printed URL still works as before
});

test("an expired code is 401", async () => {
  const s = await boot({ codeTtlMs: 30 });
  const code = codeOf(s.openUrl());
  await new Promise((r) => setTimeout(r, 80));
  assert.equal((await auth(s, code)).status, 401);
});

test("argv of the browser launcher never contains the token", async () => {
  const s = await boot();
  const seen: string[][] = [];
  for (const platform of ["darwin", "linux", "win32"]) {
    const [cmd, ...args] = launcher(s.openUrl(), platform);
    seen.push([cmd, ...args]);
  }
  openBrowser(s.openUrl(), (cmd, args) => seen.push([cmd, ...args]));
  assert.ok(seen.length >= 4);
  assert.ok(!JSON.stringify(seen).includes(s.token), JSON.stringify(seen));
  assert.ok(seen.every((a) => a.some((x) => x.includes("code="))));
});

test("hostWarning: loopback is quiet, anything else warns", () => {
  for (const h of ["127.0.0.1", "127.1.2.3", "localhost", "::1"]) assert.equal(hostWarning(h), undefined, h);
  for (const h of ["0.0.0.0", "::", "192.168.1.5", "myhost.lan"]) assert.match(hostWarning(h)!, /^WARNING: --host .*network/, h);
});

test("SSE clients are capped", async () => {
  const s = await boot({ maxSseClients: 2 });
  const open = (): Promise<number> => new Promise((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port: s.port, path: "/api/events", headers: { Host: `127.0.0.1:${s.port}`, "X-Gitask-Token": s.token } }, (res) => {
      resolve(res.statusCode!);
      if (res.statusCode === 200) res.on("data", () => undefined); else res.resume();
      sockets.push(res.socket);
    });
    r.on("error", reject); r.end();
  });
  assert.deepEqual([await open(), await open(), await open()], [200, 200, 503]);
});

test("a body that stalls is answered 408 and dropped", async () => {
  const s = await boot({ bodyTimeoutMs: 150 });
  const sock = connect(s.port, "127.0.0.1");
  sockets.push(sock);
  const text = await new Promise<string>((resolve) => {
    let got = "";
    sock.on("data", (d) => (got += d));
    sock.on("close", () => resolve(got));
    sock.write(`POST /api/message HTTP/1.1\r\nHost: 127.0.0.1:${s.port}\r\nX-Gitask-Token: ${s.token}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{"type"`);
    setTimeout(() => resolve(got), 3000);
  });
  assert.match(text, /^HTTP\/1\.1 408/);
});

test("maxConnections drops connections beyond the limit", async () => {
  const s = await boot({ maxConnections: 2 });
  const hold = () => new Promise<Socket>((resolve) => { const k = connect(s.port, "127.0.0.1", () => resolve(k)); sockets.push(k); });
  await hold(); await hold();
  await new Promise((r) => setTimeout(r, 50));
  const third = connect(s.port, "127.0.0.1");
  sockets.push(third);
  let answered = false;
  third.on("data", () => (answered = true));
  const closed = await new Promise<boolean>((resolve) => {
    third.on("close", () => resolve(true)); third.on("error", () => undefined);
    third.write(`GET /api/board HTTP/1.1\r\nHost: 127.0.0.1:${s.port}\r\n\r\n`);
    setTimeout(() => resolve(false), 2000);
  });
  assert.equal(closed, true);
  assert.equal(answered, false);
});
