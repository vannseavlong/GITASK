import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { startServer, type RunningServer } from "../src/serve.ts";

const TASK = "# One\n\n- **ID:** T-0001\n- **Owner:** Sam\n- **Tier:** T1\n- **Started / updated:** 2026-10-02 / 2026-10-05\n\n## Sub-tasks\n- [ ] first @sam #backend\n- [ ] second\n";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "gitask-eh-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "2-todo"), { recursive: true });
  writeFileSync(join(tasks, "2-todo", "A-one.md"), TASK);
  writeFileSync(join(root, "other.txt"), "x");
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString().trim();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  g("add", "--", "Tasks", "other.txt"); g("commit", "-q", "-m", "init");
  return { root, g, file: join(tasks, "2-todo", "A-one.md"), tasks };
}

const servers: RunningServer[] = [];
after(async () => { for (const s of servers) await s.close(); });

async function post(s: RunningServer, msg: unknown): Promise<{ status: number; json: any }> {
  const data = JSON.stringify(msg);
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: s.port, path: "/api/message", method: "POST", headers: { Host: `127.0.0.1:${s.port}`, "X-Gitask-Token": s.token, "Content-Type": "application/json" } }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, json: b ? JSON.parse(b) : {} }));
    });
    req.on("error", reject);
    req.end(data);
  });
}

test("editTask, editSubtask and deleteSubtask over HTTP commit only the task file", async () => {
  const r = repo();
  writeFileSync(join(r.root, "other.txt"), "dirty");
  const s = await startServer({ dir: r.tasks, port: 0, assets: { js: "1", css: "a{}" }, debounceMs: 20 });
  servers.push(s);
  const a = await post(s, { type: "editTask", path: r.file, patch: { title: "Edited", due: "2026-11-30", tier: "T3" } });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  const raw1 = readFileSync(r.file, "utf8");
  assert.ok(raw1.startsWith("# Edited\n"), raw1);
  assert.ok(raw1.includes("- **Due:** 2026-11-30\n") && raw1.includes("- **Tier:** T3\n"));
  assert.equal(r.g("show", "--name-only", "--format=%s", "HEAD"), "task(A-one): edit title, due, tier\n\nTasks/2-todo/A-one.md");

  const line = raw1.split("\n").findIndex((l) => l.startsWith("- [ ] first")) + 1;
  const b = await post(s, { type: "editSubtask", path: r.file, index: 0, line, text: "first v2", assignee: null });
  assert.equal(b.status, 200);
  assert.ok(readFileSync(r.file, "utf8").includes("- [ ] first v2 #backend\n"));

  const refused = await post(s, { type: "deleteSubtask", path: r.file, index: 0, line });
  assert.equal(refused.json.reply?.type ?? refused.json.type, "error");
  assert.ok(readFileSync(r.file, "utf8").includes("first v2"), "unconfirmed delete must not remove");
  await post(s, { type: "deleteSubtask", path: r.file, index: 0, line, confirmed: true });
  const after = readFileSync(r.file, "utf8");
  assert.ok(!after.includes("first v2") && after.includes("- [ ] second\n"));
  assert.equal(r.g("show", "--name-only", "--format=", "HEAD"), "Tasks/2-todo/A-one.md");
  assert.equal(r.g("status", "--porcelain"), "M other.txt");

  const stale = await post(s, { type: "editSubtask", path: r.file, index: 0, line: 99, text: "x" });
  assert.equal(stale.json.reply?.type ?? stale.json.type, "error");
  const bad = await post(s, { type: "editTask", path: r.file, patch: { title: "a\n- **Owner:** evil" } });
  assert.equal(bad.status, 400);
});
