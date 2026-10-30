import { test } from "node:test";
import assert from "node:assert/strict";
import { createHttpHost } from "../../ui/src/host/http-host.ts";
import { cancelDelete, confirmDelete, pendingDelete, requestDelete } from "../../ui/src/lib/delete-flow.ts";

test("http host sends ready after getBoard so the server backfills ids and people", async () => {
  const calls: { url: string; body?: string }[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: { body?: string }) => {
    calls.push({ url: String(url), body: init?.body });
    return new Response(JSON.stringify({ columns: [], dir: "/t" }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const host = createHttpHost("http://x");
    await host.getBoard();
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(calls.some((c) => c.url.endsWith("/api/board")));
    assert.ok(calls.some((c) => c.url.endsWith("/api/message") && c.body === JSON.stringify({ type: "ready" })), JSON.stringify(calls));
  } finally {
    globalThis.fetch = real;
  }
});

test("delete flow: browser asks first and only the confirm sends confirmed:true; VS Code sends plain", () => {
  const sent: unknown[] = [];
  const browser = { confirmsDelete: true, send: (m: unknown) => void sent.push(m) } as never;
  requestDelete(browser, { kind: "task", path: "/t/2-todo/a.md", label: "a" });
  assert.deepEqual(sent, [{ type: "deleteImpact", path: "/t/2-todo/a.md" }]);
  assert.equal(pendingDelete()?.kind, "task");
  cancelDelete();
  assert.equal(pendingDelete(), null);
  assert.equal(sent.length, 1, "cancel sends nothing");
  confirmDelete();
  assert.equal(sent.length, 1, "nothing pending, nothing sent");
  requestDelete(browser, { kind: "column", column: "1-backlog", label: "backlog" });
  confirmDelete();
  assert.deepEqual(sent.at(-1), { type: "deleteColumn", column: "1-backlog", confirmed: true });

  const vscode = { confirmsDelete: false, send: (m: unknown) => void sent.push(m) } as never;
  requestDelete(vscode, { kind: "task", path: "/t/2-todo/a.md", label: "a" });
  assert.deepEqual(sent.at(-1), { type: "deleteTask", path: "/t/2-todo/a.md" });
  assert.equal(pendingDelete(), null);
});
