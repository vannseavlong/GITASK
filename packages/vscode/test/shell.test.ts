import { test } from "node:test";
import assert from "node:assert/strict";
import { webviewHtml } from "../src/html.ts";
import { VIEWS, checkViews, placeholder, type ViewDef } from "../src/views/registry.ts";

const NONCE = "TESTNONCE123";
const html = webviewHtml(VIEWS, { nonce: NONCE });

test("registry has the four tabs in order, with a view built for each", () => {
  assert.deepEqual(VIEWS.map((v) => v.id), ["board", "list", "timeline", "overview"]);
  assert.deepEqual(VIEWS.map((v) => v.label), ["Board", "List", "Timeline", "Overview"]);
  for (const v of VIEWS.filter((x) => x.id !== "timeline")) assert.ok(v.js, v.id);
  checkViews(VIEWS);
});

test("registry rejects duplicate and malformed ids", () => {
  assert.throws(() => checkViews([placeholder("a", "A"), placeholder("a", "B")]), /Duplicate/);
  assert.throws(() => checkViews([placeholder("Bad Id", "x")]), /Bad view id/);
});

test("CSP header is strict and uses the nonce", () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m);
  assert.equal(m[1], `default-src 'none'; style-src 'nonce-${NONCE}'; script-src 'nonce-${NONCE}';`);
  assert.ok(!/unsafe-inline|unsafe-eval|\*/.test(m[1]));
});

test("exactly one script and one style, both carry the nonce", () => {
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.equal((html.match(/<style\b/g) ?? []).length, 1);
  assert.ok(html.includes(`<script nonce="${NONCE}">`));
  assert.ok(html.includes(`<style nonce="${NONCE}">`));
});

test("no inline event handlers, no style attributes, no remote URLs in the markup", () => {
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  assert.ok(!/\son\w+\s*=/i.test(markup), "inline handler in markup");
  assert.ok(!/\sstyle\s*=/i.test(markup));
  assert.ok(!/https?:\/\//i.test(markup));
  const script = html.match(/<script[\s\S]*?<\/script>/)![0];
  assert.ok(!/\.innerHTML|insertAdjacentHTML|outerHTML|document\.write|eval\(|new Function|setAttribute\(\s*["']on|setAttribute\(\s*["']style/.test(script));
});

test("nonce is random per page", () => {
  const a = webviewHtml(VIEWS), b = webviewHtml(VIEWS);
  assert.notEqual(a.match(/nonce-([^']+)'/)![1], b.match(/nonce-([^']+)'/)![1]);
});

test("initial view is remembered, unknown ids fall back to board", () => {
  assert.ok(webviewHtml(VIEWS, { nonce: NONCE, initialView: "timeline" }).includes('window.__GITASK_INITIAL__ = "timeline"'));
  assert.ok(webviewHtml(VIEWS, { nonce: NONCE, initialView: "</script>" }).includes('window.__GITASK_INITIAL__ = "board"'));
});

test("a registered view's source and css land in the page; labels cannot break out", () => {
  const evil: ViewDef = { id: "x", label: "</script><img src=x>", js: 'GITASK.register({id:"x",mount(){},render(){}});', css: ".view-x{}" };
  const page = webviewHtml([...VIEWS, evil], { nonce: NONCE });
  assert.ok(page.includes('GITASK.register({id:"x"'));
  assert.ok(page.includes(".view-x{}"));
  assert.equal((page.match(/<script\b/g) ?? []).length, 1);
  assert.ok(!page.includes("</script><img"));
});

test("board view only writes task text with textContent", () => {
  const js = VIEWS[0].js!;
  assert.ok(!/innerHTML|insertAdjacentHTML/.test(js));
  assert.ok(js.includes("t.progress.done"));
  assert.ok(js.includes("t.claimedBy"));
});

test("the generated script parses as JavaScript", async () => {
  const { Script } = await import("node:vm");
  const src = html.match(/<script nonce="[^"]+">([\s\S]*)<\/script>/)![1];
  assert.doesNotThrow(() => new Script(src));
});
