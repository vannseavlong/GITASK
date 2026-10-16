import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKDOWN_JS } from "../src/markdown.ts";
import { webviewHtml } from "../src/html.ts";
import { VIEWS } from "../src/views/registry.ts";

// The tested code is the shipped code: the same string is inlined into the webview.
interface MD {
  parse(t: string): any[];
  sections(b: any[]): { title: string; preamble: any[]; sections: { title: string; blocks: any[] }[] };
  renderBlocks(b: any[], el: any, o: any): FakeEl[];
  safeHref(u: string): string | null;
}
const MD = new Function(MARKDOWN_JS + "\nreturn GITASK_MD;")() as MD;

class FakeEl {
  children: FakeEl[] = [];
  attrs: Record<string, string> = {};
  tag: string;
  cls: string;
  textContent: string;
  constructor(tag: string, cls = "", textContent = "") { this.tag = tag; this.cls = cls; this.textContent = textContent; }
  append(...n: FakeEl[]) { for (const x of n) { assert.ok(x instanceof FakeEl, "only elements are appended"); this.children.push(x); } }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
}
const el = (tag: string, cls?: string, text?: string) => new FakeEl(tag, cls, text);
const ALLOWED = new Set(["span", "code", "strong", "em", "a", "input", "ul", "ol", "li", "h4", "h5", "h6", "p", "blockquote", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td"]);
const opts = { checkbox: (c: any) => { const e = new FakeEl("input"); e.attrs["data-line"] = String(c.line) + ":" + c.ord; return e; } };

function walk(n: FakeEl, f: (n: FakeEl) => void) { f(n); for (const c of n.children) walk(c, f); }
function render(md: string): FakeEl[] { return MD.renderBlocks(MD.parse(md), el, opts); }
function all(md: string): FakeEl[] { const out: FakeEl[] = []; for (const r of render(md)) walk(r, (n) => out.push(n)); return out; }

test("renders headings, paragraphs, lists, code, emphasis, tables", () => {
  const md = "# T\n\n## Goal\nSome **bold** and *it* and `code`.\n\n- a\n- b\n  - nested\n\n1. one\n2. two\n\n```ts\nconst x = 1;\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n";
  const doc = MD.sections(MD.parse(md));
  assert.equal(doc.title, "T");
  assert.equal(doc.sections[0].title, "Goal");
  const tags = all(md).map((n) => n.tag);
  for (const t of ["strong", "em", "code", "ul", "ol", "li", "pre", "table", "th", "td"]) assert.ok(tags.includes(t), t);
  assert.equal(all(md).filter((n) => n.tag === "li").length, 5);
  assert.equal(all(md).find((n) => n.tag === "pre")!.children[0].textContent, "const x = 1;");
});

test("hostile input stays inert text: only allowlisted tags, text never becomes markup", () => {
  const hostile = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "[x](javascript:alert(1))",
    "[x](JaVaScRiPt:alert(1))",
    "[x](data:text/html;base64,AAAA)",
    "[x](vbscript:msgbox)",
    "[x](//evil.example/x)",
    "[x](  javascript:alert(1))",
    "<a href=\"javascript:alert(1)\">x</a>",
    "<iframe src=//evil></iframe>",
    "![img](http://evil/x.png)",
    "- [ ] <svg onload=alert(1)>",
    "| <b>x</b> | y |\n|---|---|\n| <script> | z |",
    "```\n<script>alert(1)</script>\n```",
  ].join("\n\n");
  const nodes = all(hostile);
  for (const n of nodes) assert.ok(ALLOWED.has(n.tag), "unexpected tag " + n.tag);
  for (const n of nodes) if (n.tag === "a") assert.match(n.attrs.href, /^https?:\/\//i);
  // The only anchor allowed is the http target of the image syntax, which renders as a plain link, never an <img>.
  assert.deepEqual(nodes.filter((n) => n.tag === "a").map((n) => n.attrs.href), ["http://evil/x.png"]);
  for (const n of nodes) for (const k of Object.keys(n.attrs)) assert.ok(["start", "data-line", "href", "rel"].includes(k), "attr " + k);
  const text = nodes.map((n) => n.textContent).join("|");
  assert.ok(text.includes("<script>alert(1)</script>"), "script shown as text");
  assert.ok(text.includes("<img src=x onerror=alert(1)>"));
});

test("links: http and https only", () => {
  const a = all("[ok](https://example.com/a?b=1) and [ok2](http://example.com) <https://auto.example/x> [rel](./docs/x.md) [bad](ftp://x)").filter((n) => n.tag === "a");
  assert.deepEqual(a.map((n) => n.attrs.href), ["https://example.com/a?b=1", "http://example.com", "https://auto.example/x"]);
  assert.ok(a.every((n) => n.attrs.rel === "noopener noreferrer"));
  const text = all("[rel](./docs/x.md)").map((n) => n.textContent).join("");
  assert.ok(text.includes("rel") && text.includes("./docs/x.md"), "relative link shown as text");
  assert.equal(MD.safeHref("javascript:alert(1)"), null);
  assert.equal(MD.safeHref("https://a.b/c d"), null);
  assert.equal(MD.safeHref("https://a.b/\"onmouseover=x"), null);
});

test("huge nesting and pathological input finish quickly and stay bounded", () => {
  const t0 = Date.now();
  const deepList = Array.from({ length: 5000 }, (_, i) => " ".repeat(i % 400) + "- item " + i).join("\n");
  const deepEm = "*a ".repeat(50000) + "**".repeat(50000) + "[".repeat(50000) + "](".repeat(50000);
  const deepQuote = "> ".repeat(20000) + "x";
  const fences = "```\n".repeat(50000);
  const tableBomb = "|" + "a|".repeat(5000) + "\n|" + "-|".repeat(5000) + "\n" + ("|" + "x|".repeat(5000) + "\n").repeat(500);
  for (const doc of [deepList, deepEm, deepQuote, fences, tableBomb, "(".repeat(300000), "`".repeat(300000)]) {
    const blocks = MD.parse(doc);
    assert.ok(blocks.length <= 4000);
    const out = MD.renderBlocks(blocks, el, opts);
    let count = 0;
    for (const r of out) walk(r, () => count++);
    assert.ok(count < 400000, "render size bounded: " + count);
  }
  // list depth is capped
  const depth = (l: any, d = 1): number => Math.max(d, ...l.items.map((n: any) => (n.sub ? depth(n.sub, d + 1) : d)));
  const blocks = MD.parse(deepList);
  assert.ok(blocks.every((b) => b.t !== "list" || depth(b) <= 8));
  assert.ok(Date.now() - t0 < 8000, "took " + (Date.now() - t0) + "ms");
});

test("checkboxes carry line and ordinal; several per line (gate rows) and fences are handled like core", () => {
  const md = "## G\n- [ ] G1 scope  - [x] G2 static  - [ ] G3\n- [x] solo\n```\n- [ ] in fence\n```\n- [ ] after\n1. [ ] numbered stays text";
  const checks = all(md).filter((n) => n.tag === "input").map((n) => n.attrs["data-line"]);
  assert.deepEqual(checks, ["2:0", "2:1", "2:2", "3:0", "7:0"]);
  const txt = all(md).map((n) => n.textContent).join("");
  assert.ok(txt.includes("[ ] numbered stays text"));
});

test("frontmatter is skipped, line numbers stay those of the file", () => {
  const md = "---\ntier: T1\n---\n# T\n- [ ] a";
  const b = MD.parse(md);
  assert.equal(b[0].t, "h");
  assert.equal(b[1].items[0].line, 5);
});

test("sections drops header bullets and splits on ##", () => {
  const md = "# Task\n\n- **Repo:** GITASK\n- **Owner:** me\n\nIntro text.\n\n## Goal\ng\n\n## Notes\nn\n";
  const d = MD.sections(MD.parse(md));
  assert.equal(d.title, "Task");
  assert.equal(d.preamble.length, 1);
  assert.deepEqual(d.sections.map((s) => s.title), ["Goal", "Notes"]);
});

test("shipped page: markdown and detail are inlined into the single nonce'd script, CSP unchanged", () => {
  const html = webviewHtml(VIEWS, { nonce: "N" });
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
  assert.ok(html.includes("GITASK.openDetail = function"));
  assert.ok(html.includes("const GITASK_MD"));
  assert.ok(html.includes("default-src 'none'; style-src 'nonce-N'; script-src 'nonce-N';"));
  const script = html.slice(html.indexOf("<script"), html.lastIndexOf("</script>"));
  assert.ok(!/\.innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(script));
  new Function(script.replace(/^<script[^>]*>/, "")); // parses
});
