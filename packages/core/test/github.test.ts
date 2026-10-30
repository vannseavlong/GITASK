import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applySync, GithubError, loadBoard, parseGithubConfig, planSync, setIssueField } from "../src/index.ts";
import type { Person } from "../src/index.ts";

const TOKEN = "ghp_SECRETTOKEN123";
const people: Person[] = [
  { id: "sam-lee", name: "Sam Lee", github: "samlee" },
  { id: "ann-roe", name: "Ann Roe", github: "annroe" },
  { id: "no-gh", name: "No Gh" },
];
const config = { repo: "acme/app" };

const task = (owner: string, subs = "", title = "X") =>
  `# ${title}\n\n- **Owner:** ${owner}\n- **Started / updated:** 2026-10-02 / 2026-10-05\n\n## Goal\nx\n\n## Done when\n- [ ] a\n${subs}`;

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-gh-"));
  for (const c of ["2-todo", "3-in-progress", "5-done"]) mkdirSync(join(root, "Tasks", c), { recursive: true });
  writeFileSync(join(root, "Tasks", "2-todo", "A-one.md"), task("Sam Lee", "\n## Sub-tasks\n- [ ] first @ann-roe\n- [x] second\n- [ ] third @no-gh\n", "One"));
  writeFileSync(join(root, "Tasks", "3-in-progress", "A-two.md"), task("No Gh", "", "Two"));
  writeFileSync(join(root, "Tasks", "5-done", "A-old.md"), task("Ann Roe", "", "Old"));
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t.t");
  g("config", "user.name", "T");
  g("add", "--", "Tasks");
  g("commit", "-q", "-m", "init");
  return { root, tasks: join(root, "Tasks"), g };
}

interface Req { method: string; url: string; auth?: string; body: any }
interface Fake { base: string; reqs: Req[]; issues: any[]; fail: (match: RegExp, status: number, headers?: Record<string, string>, body?: unknown) => void; close: () => Promise<void> }

async function fake(): Promise<Fake> {
  const issues: any[] = [];
  const reqs: Req[] = [];
  const subs = new Map<number, number[]>();
  const faults: { match: RegExp; status: number; headers: Record<string, string>; body: unknown }[] = [];
  const items: any[] = [];
  let nextId = 9000;
  const server: Server = createServer(async (req: IncomingMessage, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : undefined;
    const r: Req = { method: req.method!, url: req.url!, auth: req.headers.authorization, body };
    reqs.push(r);
    const send = (status: number, data: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(JSON.stringify(data));
    };
    const key = `${r.method} ${r.url}`;
    const f = faults.find((x) => x.match.test(key));
    if (f) return send(f.status, f.body, f.headers);
    const u = new URL(r.url, "http://x");
    const p = u.pathname;
    let m: RegExpExecArray | null;
    const mk = (b: any) => {
      const n = issues.length + 1;
      const i = { id: nextId++, number: n, title: b.title, body: b.body ?? "", state: "open", assignees: (b.assignees ?? []).map((l: string) => ({ login: l })), html_url: `https://github.com/acme/app/issues/${n}` };
      issues.push(i);
      return i;
    };
    if (r.method === "POST" && p === "/repos/acme/app/issues") return send(201, mk(body));
    if ((m = /^\/repos\/acme\/app\/issues\/(\d+)$/.exec(p))) {
      const i = issues[Number(m[1]) - 1];
      if (!i) return send(404, { message: "Not Found" });
      if (r.method === "PATCH") {
        if (body.title !== undefined) i.title = body.title;
        if (body.state !== undefined) i.state = body.state;
        if (body.assignees) i.assignees = body.assignees.map((l: string) => ({ login: l }));
      }
      return send(200, i);
    }
    if ((m = /^\/repos\/acme\/app\/issues\/(\d+)\/sub_issues$/.exec(p))) {
      const list = subs.get(Number(m[1])) ?? [];
      if (r.method === "GET") return send(200, list.map((id) => issues.find((x) => x.id === id)));
      list.push(body.sub_issue_id);
      subs.set(Number(m[1]), list);
      return send(201, issues[Number(m[1]) - 1]);
    }
    if (p === "/orgs/acme/projectsV2/7/fields") return send(200, [{ id: 55, name: "Status", data_type: "single_select", options: [{ id: "o1", name: { raw: "todo" } }, { id: "o2", name: { raw: "In Progress" } }] }]);
    if (p === "/orgs/acme/projectsV2/7/items" && r.method === "POST") {
      const it = { id: 700 + items.length, ...body };
      items.push(it);
      return send(201, it);
    }
    if ((m = /^\/orgs\/acme\/projectsV2\/7\/items\/(\d+)$/.exec(p)) && r.method === "PATCH") return send(200, { id: Number(m[1]) });
    return send(404, { message: "Not Found" });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const port = (server.address() as { port: number }).port;
  return {
    base: `http://127.0.0.1:${port}`,
    reqs,
    issues,
    fail: (match, status, headers = {}, body = { message: "boom" }) => void faults.push({ match, status, headers, body }),
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}

const plan = async (tasks: string, opts = {}, cfg: any = config) => planSync(await loadBoard(tasks), cfg, people, opts);

test("plan: default skips done tasks, assigns by github name, lists sub-issues and who is notified; pure", async () => {
  const { tasks } = repo();
  const before = readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8");
  const p = await plan(tasks);
  assert.deepEqual(p.issues.map((i) => i.taskId), ["A-one", "A-two"]);
  const one = p.issues[0];
  assert.equal(one.action, "create");
  assert.deepEqual(one.assignees, ["samlee"]);
  assert.deepEqual(one.subIssues, [
    { title: "first", state: "open", assignees: ["annroe"] },
    { title: "second", state: "closed", assignees: [] },
    { title: "third", state: "open", assignees: [] },
  ]);
  assert.deepEqual(p.notify.map((n) => n.login).sort(), ["annroe", "samlee"]);
  assert.ok(p.warnings.some((w) => w.includes("No Gh") && w.includes("no GitHub name")));
  assert.deepEqual(p.issues[1].assignees, []); // skipped person is never guessed
  assert.equal(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), before);
});

test("plan: project adds status; explicit task list includes done; unknown task warns", async () => {
  const { tasks } = repo();
  const p = await plan(tasks, { tasks: ["A-old", "Nope"] }, { repo: "acme/app", project: 7 });
  assert.equal(p.issues[0].state, "closed");
  assert.equal(p.issues[0].status, "done");
  assert.ok(p.warnings.includes("Task not found: Nope"));
});

test("config: github block parsed, bad repo rejected, no block means undefined", () => {
  assert.deepEqual(parseGithubConfig('{"github":{"repo":"a/b","project":3},"columns":{}}'), { repo: "a/b", project: 3 });
  assert.equal(parseGithubConfig('{"github":{"repo":"a/b/../c"}}'), undefined);
  assert.equal(parseGithubConfig('{"people":[]}'), undefined);
  assert.equal(parseGithubConfig("nope"), undefined);
});

test("setIssueField inserts once and replaces", () => {
  const a = setIssueField(task("S"), 5);
  assert.match(a, /- \*\*Issue:\*\* #5\n- \*\*Owner:\*\*/);
  assert.match(setIssueField(a, 9), /- \*\*Issue:\*\* #9/);
  assert.equal(setIssueField(a, 9).match(/Issue:/g)?.length, 1);
});

test("apply: creates issues, sub-issues, status; writes Issue line and commits only that file; token only in the header", async () => {
  const { root, tasks, g } = repo();
  const srv = await fake();
  try {
    writeFileSync(join(root, "unrelated.txt"), "u");
    g("add", "--", "unrelated.txt"); // staged by someone else: must not be swept in
    const p = await plan(tasks, {}, { repo: "acme/app", project: 7 });
    const r = await applySync(p, TOKEN, { fetch, baseUrl: srv.base });
    assert.deepEqual(r.issues.map((i) => [i.taskId, i.number, i.action]), [["A-one", 1, "created"], ["A-two", 5, "created"]]);
    assert.equal(r.issues[0].project, "set");
    assert.deepEqual(srv.issues[0].assignees, [{ login: "samlee" }]);
    assert.match(srv.issues[0].body, /Tracked in GITASK/);
    assert.equal(srv.issues[2].state, "closed"); // checked sub-task
    assert.match(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), /- \*\*Issue:\*\* #1\n/);
    const last = g("show", "--stat", "--format=%s", "HEAD~1");
    assert.match(last, /link GitHub issue/);
    assert.ok(!g("show", "--name-only", "--format=", "HEAD").includes("unrelated"));
    assert.ok(srv.reqs.every((q) => q.auth === `Bearer ${TOKEN}`));
    assert.ok(srv.reqs.some((q) => q.url.endsWith("/items") && q.body.number === 1));
    assert.ok(!JSON.stringify(srv.reqs.map((q) => q.body)).includes(TOKEN));
    assert.ok(!readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8").includes(TOKEN));
  } finally {
    await srv.close();
  }
});

test("apply twice: second sync updates, never duplicates", async () => {
  const { tasks } = repo();
  const srv = await fake();
  try {
    await applySync(await plan(tasks), TOKEN, { fetch, baseUrl: srv.base });
    const count = srv.issues.length;
    assert.equal(count, 5); // 2 parents + 3 sub-issues
    const p2 = await plan(tasks);
    assert.deepEqual(p2.issues.map((i) => [i.action, i.issue]), [["update", 1], ["update", 5]]);
    const r2 = await applySync(p2, TOKEN, { fetch, baseUrl: srv.base });
    assert.equal(srv.issues.length, count);
    assert.ok(r2.issues.every((i) => i.action === "unchanged" && i.subIssues.every((s) => s.action === "unchanged")));
    assert.equal(srv.reqs.filter((q) => q.method === "PATCH").length, 1 /* closed sub-issue on first run */);
    // change the owner locally: second sync patches assignees only
    writeFileSync(join(tasks, "2-todo", "A-one.md"), readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8").replace("Sam Lee", "Ann Roe"));
    const r3 = await applySync(await plan(tasks), TOKEN, { fetch, baseUrl: srv.base });
    assert.equal(r3.issues[0].action, "updated");
    assert.deepEqual(srv.issues[0].assignees, [{ login: "annroe" }]);
    assert.equal(srv.issues.length, count);
  } finally {
    await srv.close();
  }
});

test("apply: a plan without an assignee never clears assignees already on the issue", async () => {
  const { tasks } = repo();
  const srv = await fake();
  try {
    await applySync(await plan(tasks), TOKEN, { fetch, baseUrl: srv.base });
    assert.deepEqual(srv.issues[0].assignees, [{ login: "samlee" }]);
    writeFileSync(join(tasks, "2-todo", "A-one.md"), readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8").replace("Sam Lee", "Nobody Known"));
    const p = await plan(tasks);
    assert.deepEqual(p.issues[0].assignees, []);
    const before = srv.reqs.filter((q) => q.method === "PATCH").length;
    const r = await applySync(p, TOKEN, { fetch, baseUrl: srv.base });
    assert.equal(r.issues[0].action, "unchanged");
    assert.equal(srv.reqs.filter((q) => q.method === "PATCH").length, before);
    assert.deepEqual(srv.issues[0].assignees, [{ login: "samlee" }]);
  } finally {
    await srv.close();
  }
});

async function failure(status: number, headers: Record<string, string> = {}, body: unknown = { message: `bad ${TOKEN}` }, match = /POST \/repos\/acme\/app\/issues$/) {
  const { tasks, g } = repo();
  const srv = await fake();
  try {
    srv.fail(match, status, headers, body);
    const p = await plan(tasks);
    const before = readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8");
    const err = await applySync(p, TOKEN, { fetch, baseUrl: srv.base }).then(() => undefined, (e: unknown) => e);
    assert.ok(err instanceof GithubError, String(err));
    assert.ok(!err.message.includes(TOKEN), "token leaked: " + err.message);
    assert.equal(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), before);
    assert.equal(g("status", "--porcelain", "--", "Tasks"), "");
    return err;
  } finally {
    await srv.close();
  }
}

test("401 gives an auth error and changes nothing", async () => {
  const e = await failure(401);
  assert.equal(e.kind, "auth");
  assert.match(e.message, /401/);
});

test("403, 404 and 422 are clear and scrubbed", async () => {
  assert.equal((await failure(403)).kind, "forbidden");
  assert.equal((await failure(404)).kind, "not-found");
  const e = await failure(422, {}, { message: "Validation Failed", errors: [{ field: "assignees", code: "invalid", value: "x" }] });
  assert.equal(e.kind, "invalid");
  assert.match(e.message, /assignees/);
});

test("rate limit (403 with remaining 0, and 429) is reported as such", async () => {
  const a = await failure(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1893456000" });
  assert.equal(a.kind, "rate-limit");
  assert.match(a.message, /2030-/);
  const b = await failure(429, { "retry-after": "30" });
  assert.equal(b.kind, "rate-limit");
  assert.match(b.message, /30 s/);
  assert.equal((await failure(403, {}, { message: "You have exceeded a secondary rate limit" })).kind, "rate-limit");
});

test("offline: clear error, local file unchanged, no token in message", async () => {
  const { tasks } = repo();
  const p = await plan(tasks);
  const before = readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8");
  const dead: typeof fetch = async () => { throw new TypeError(`fetch failed for Bearer ${TOKEN}`); };
  const err = await applySync(p, TOKEN, { fetch: dead }).then(() => undefined, (e: unknown) => e);
  assert.ok(err instanceof GithubError && err.kind === "offline");
  assert.ok(!err.message.includes(TOKEN));
  assert.equal(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), before);
});

test("failure mid-run keeps the numbers of issues already created so a retry does not duplicate", async () => {
  const { tasks } = repo();
  const srv = await fake();
  try {
    srv.fail(/POST \/repos\/acme\/app\/issues\/1\/sub_issues/, 422);
    await assert.rejects(applySync(await plan(tasks), TOKEN, { fetch, baseUrl: srv.base }), GithubError);
    assert.match(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), /\*\*Issue:\*\* #1/);
    assert.equal(parseInt(String(srv.issues.length)), 2); // parent + the child that could not be attached
  } finally {
    await srv.close();
  }
});

test("empty token and missing issue are refused before/with clear errors", async () => {
  const { tasks } = repo();
  await assert.rejects(applySync(await plan(tasks), "  "), /No GitHub token/);
  const srv = await fake();
  try {
    writeFileSync(join(tasks, "2-todo", "A-one.md"), setIssueField(readFileSync(join(tasks, "2-todo", "A-one.md"), "utf8"), 99));
    await assert.rejects(applySync(await plan(tasks, { tasks: ["A-one"] }), TOKEN, { fetch, baseUrl: srv.base }), (e: GithubError) => e.kind === "not-found");
  } finally {
    await srv.close();
  }
});
