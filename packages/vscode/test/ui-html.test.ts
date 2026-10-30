import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { uiHtml } from "../src/html.ts";
import { VIEW_IDS } from "../src/view-ids.ts";
import { validateMessage } from "../src/protocol.ts";

const NONCE = "TESTNONCE123";
const CSP_SOURCE = "https://file+.vscode-resource.vscode-cdn.net";
const page = (extra: object = {}) =>
  uiHtml(VIEW_IDS, { nonce: NONCE, cspSource: CSP_SOURCE, scriptUri: CSP_SOURCE + "/ext/dist/ui/ui.js", styleUri: CSP_SOURCE + "/ext/dist/ui/ui.css", ...extra });

test("UI page CSP: nonce + cspSource scripts, no eval, style attributes only inline", () => {
  const m = page().match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m);
  assert.equal(
    m[1],
    `default-src 'none'; script-src 'nonce-${NONCE}' ${CSP_SOURCE}; style-src ${CSP_SOURCE} 'nonce-${NONCE}'; style-src-attr 'unsafe-inline';`,
  );
  assert.ok(!/unsafe-eval/.test(m[1]));
  // unsafe-inline appears only in style-src-attr
  assert.equal(m[1].replace("style-src-attr 'unsafe-inline'", "").includes("unsafe-inline"), false);
});

test("UI page loads the bundle from files; no inline script or style element, no inline handlers", () => {
  const html = page();
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.ok(html.includes(`<script type="module" nonce="${NONCE}" src="${CSP_SOURCE}/ext/dist/ui/ui.js"></script>`));
  assert.ok(!/<style\b/.test(html));
  assert.ok(!/\son\w+\s*=/i.test(html));
  assert.ok(html.includes(`href="${CSP_SOURCE}/ext/dist/ui/ui.css"`));
});

test("UI page: nonce is random per page and handed to the app; initial view is checked", () => {
  const a = uiHtml(VIEW_IDS, { cspSource: "x", scriptUri: "a", styleUri: "b" });
  const b = uiHtml(VIEW_IDS, { cspSource: "x", scriptUri: "a", styleUri: "b" });
  assert.notEqual(a.match(/data-nonce="([^"]+)"/)![1], b.match(/data-nonce="([^"]+)"/)![1]);
  assert.ok(page({ initialView: "timeline" }).includes('data-initial-view="timeline"'));
  assert.ok(page({ initialView: '"><script>' }).includes('data-initial-view="board"'));
});

test("UI page: hostile uri or cspSource cannot break out of the attribute", () => {
  const html = page({ scriptUri: 'x"><script>alert(1)</script>' });
  assert.ok(!html.includes('"><script>alert'));
});

test("the UI's tab ids are the extension's registered view ids (the `view` message is validated against them)", () => {
  const src = readFileSync(new URL("../../ui/src/views/registry.tsx", import.meta.url), "utf8");
  const ids = [...src.matchAll(/\bid: "([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, VIEW_IDS);
});

test("every message the UI sends passes validateMessage", () => {
  const dir = "/w/Tasks";
  const ctx = { tasksDir: dir, columns: ["1-backlog", "2-todo"], views: VIEW_IDS };
  const path = dir + "/1-backlog/A-b.md";
  for (const m of [
    { type: "ready" }, { type: "new" }, { type: "open", path }, { type: "move", path, to: "2-todo" },
    { type: "deleteTask", path }, { type: "deleteColumn", column: "2-todo" },
    { type: "setColumnColor", column: "2-todo", color: "#3794ff" }, { type: "setColumnColor", column: "2-todo", color: null },
    ...VIEW_IDS.map((id) => ({ type: "view", id })),
  ]) assert.equal(validateMessage(m, ctx).ok, true, JSON.stringify(m));
});
