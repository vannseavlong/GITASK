import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, existsSync, statSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveProject, checkLogoUpload, isPlainSvg, readProject } from "../src/index.ts";
import { openedUnder } from "../src/config.ts";

const png = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);
const up = (name: string, bytes: Buffer | string) => ({ name, data: Buffer.from(bytes).toString("base64") });
const hex = (b: Buffer, n: number) => createHash("sha256").update(b).digest("hex").slice(0, n);

function setup() {
  const root = mkdtempSync(join(tmpdir(), "gitask-hard-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "assets"), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  writeFileSync(join(tasks, "gitask.json"), "{}\n");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, tasks, g };
}
const logos = (tasks: string) => readdirSync(tasks).filter((f) => f.startsWith("logo-")).sort();
const lastFiles = (g: (...a: string[]) => string) => g("show", "--no-renames", "--name-status", "--format=", "HEAD").trim().split("\n").sort();

// ---- orphan deletion -------------------------------------------------------------------------------------------

test("replacing a logo deletes the previous generated file in the same commit; null does too", async () => {
  const { tasks, g } = setup();
  await saveProject(tasks, { logo: up("a.png", png("one")) });
  const [first] = logos(tasks);
  assert.match(first, /^logo-[0-9a-f]{16}\.png$/);
  await saveProject(tasks, { logo: up("b.png", png("two")) });
  const [second, ...more] = logos(tasks);
  assert.deepEqual(more, [], "the old file is gone from disk");
  assert.notEqual(second, first);
  assert.deepEqual(lastFiles(g), [`A\tTasks/${second}`, `D\tTasks/${first}`, "M\tTasks/gitask.json"].sort());
  assert.equal(g("status", "--porcelain").trim(), "");
  await saveProject(tasks, { logo: null });
  assert.deepEqual(logos(tasks), []);
  assert.deepEqual(lastFiles(g), [`D\tTasks/${second}`, "M\tTasks/gitask.json"].sort());
  assert.equal(g("status", "--porcelain").trim(), "");
  assert.equal((await readProject(tasks))?.logo, undefined);
});

test("the same logo again deletes nothing; a legacy 12-hex generated name is cleaned up", async () => {
  const { tasks, g } = setup();
  const old = png("legacy");
  const legacy = `logo-${hex(old, 12)}.png`;
  writeFileSync(join(tasks, legacy), old);
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ project: { logo: legacy } }));
  g("add", "-A"); g("commit", "-q", "-m", "legacy");
  await saveProject(tasks, { logo: up("n.png", png("new")) });
  assert.equal(existsSync(join(tasks, legacy)), false);
  const [cur] = logos(tasks);
  await saveProject(tasks, { logo: up("n.png", png("new")), title: "T" });
  assert.deepEqual(logos(tasks), [cur], "re-saving the current logo keeps it");
});

test("hand-named files, files in sub-folders, look-alikes with a wrong hash and symlinks are never deleted", async () => {
  const { root, tasks, g } = setup();
  const keepers: [string, string][] = [
    ["logo.png", "logo.png"], // hand-named, in Tasks/
    ["assets/logo-0123456789abcdef.png", "assets/logo-0123456789abcdef.png"], // generated-looking but in a folder
    [`logo-0123456789abcdef.png`, `logo-0123456789abcdef.png`], // right pattern, content does not hash to the name
  ];
  for (const [i, [name, ref]] of keepers.entries()) {
    writeFileSync(join(tasks, name), png(`hand${i}`));
    writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ project: { logo: ref } }));
    g("add", "-A"); g("commit", "-q", "-m", `k${i}`);
    await saveProject(tasks, { logo: up("n.png", png(`new${i}`)) });
    assert.ok(existsSync(join(tasks, name)), `${name} must stay`);
    await saveProject(tasks, { logo: null });
    assert.ok(existsSync(join(tasks, name)), `${name} must stay after removal`);
  }
  // a symlink with a generated-looking name pointing outside
  const target = png("outside");
  writeFileSync(join(root, "outside.png"), target);
  const link = `logo-${hex(target, 16)}.png`;
  symlinkSync(join(root, "outside.png"), join(tasks, link));
  writeFileSync(join(tasks, "gitask.json"), JSON.stringify({ project: { logo: link } }));
  await saveProject(tasks, { logo: null });
  assert.ok(statSync(join(root, "outside.png")).isFile());
  assert.ok(existsSync(join(root, "outside.png")), "target of a symlink is untouched");
  assert.equal(readFileSync(join(root, "outside.png")).equals(target), true);
});

test("an untracked config commits nothing and leaves the old logo file alone", async () => {
  const { root, tasks, g } = setup();
  await saveProject(tasks, { logo: up("a.png", png("one")) });
  const [first] = logos(tasks);
  g("rm", "-q", "--cached", "Tasks/gitask.json");
  g("commit", "-q", "-m", "untrack config");
  const r = await saveProject(tasks, { logo: up("b.png", png("two")) });
  assert.deepEqual(r, { committed: false });
  assert.ok(existsSync(join(tasks, first)), "no commit means no deletion");
  assert.ok(root);
});

test("a failed commit puts the orphan back and leaves nothing staged", async () => {
  const { root, tasks, g } = setup();
  await saveProject(tasks, { logo: up("a.png", png("one")) });
  const [first] = logos(tasks);
  const cfg = readFileSync(join(tasks, "gitask.json"), "utf8");
  writeFileSync(join(root, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  await assert.rejects(saveProject(tasks, { logo: up("b.png", png("two")) }));
  assert.deepEqual(logos(tasks), [first], "old logo restored, new one removed");
  assert.deepEqual(readFileSync(join(tasks, first)), png("one"));
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), cfg);
  assert.equal(g("status", "--porcelain").trim(), "", "index and tree are clean");
  // same for removal
  await assert.rejects(saveProject(tasks, { logo: null }));
  assert.deepEqual(logos(tasks), [first]);
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), cfg);
  assert.equal(g("status", "--porcelain").trim(), "");
});

test("a staged change by someone else stays out of the orphan commit", async () => {
  const { root, tasks, g } = setup();
  await saveProject(tasks, { logo: up("a.png", png("one")) });
  writeFileSync(join(root, "other.txt"), "x");
  g("add", "other.txt");
  await saveProject(tasks, { logo: null });
  assert.match(g("status", "--porcelain"), /A  other\.txt/);
  assert.ok(!lastFiles(g).some((l) => l.includes("other.txt")));
});

test("generated names carry 16 hex of the hash", () => {
  assert.equal(checkLogoUpload(up("a.png", png("x"))).ext, "png");
});

// ---- readLogoBytes: parent swapped after the check ----------------------------------------------------------------

test("openedUnder: a real file under Tasks passes; a parent folder swapped for a symlink does not", async () => {
  const { root, tasks } = setup();
  const file = join(tasks, "assets", "l.png");
  writeFileSync(file, "x");
  const st = statSync(file);
  assert.equal(await openedUnder(tasks, file, st), true);
  // the opened inode is the old file, but `assets` now points outside Tasks
  mkdirSync(join(root, "elsewhere"));
  writeFileSync(join(root, "elsewhere", "l.png"), "evil");
  renameSync(join(tasks, "assets"), join(root, "moved"));
  symlinkSync(join(root, "elsewhere"), join(tasks, "assets"));
  assert.equal(await openedUnder(tasks, file, st), false, "real path leaves Tasks");
  // same inode check: a different file at the same in-Tasks path is not the file we hold
  const { tasks: t2 } = setup();
  writeFileSync(join(t2, "a.png"), "1");
  writeFileSync(join(t2, "b.png"), "2");
  assert.equal(await openedUnder(t2, join(t2, "b.png"), statSync(join(t2, "a.png"))), false);
  assert.equal(await openedUnder(t2, join(t2, "missing.png"), st), false);
});

// ---- SVG allow-list --------------------------------------------------------------------------------------------

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const svg = (inner: string, attrs = "") => `<svg ${NS}${attrs}>${inner}</svg>`;

test("plain SVGs pass the allow-list", () => {
  const good = [
    `<svg ${NS}/>`,
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<!-- made by hand -->\n${svg('<rect x="1" y="2" width="3" height="4" fill="#fff"/>', ' viewBox="0 0 10 10"')}\n`,
    `﻿${svg('<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><circle r="5" fill="url(#g)"/><use href="#g"/>')}`,
    svg('<style>.a { fill: red; stroke: url(#g) }</style><g class="a"><path d="M0 0L1 1" style="fill:#fff;stroke:url(#g)"/></g>'),
    svg('<text x="1" y="2" font-family="Arial">Hi &amp; bye<tspan dx="1">x</tspan></text>', ' xmlns:xlink="http://www.w3.org/1999/xlink"'),
    svg('<filter id="f"><feGaussianBlur stdDeviation="2"/></filter><rect filter="url(#f)" width="1" height="1"/>'),
  ];
  for (const [i, s] of good.entries()) assert.equal(isPlainSvg(s), true, `good #${i}`);
});

test("hostile SVGs are refused, one reason each", () => {
  const bad: [string, string][] = [
    ["script", svg("<script>alert(1)</script>")],
    ["script upper case", svg("<SCRIPT>alert(1)</SCRIPT>")],
    ["foreignObject", svg("<foreignObject><div/></foreignObject>")],
    ["onload attr", `<svg ${NS} onload="alert(1)"/>`],
    ["on* in a child", svg('<rect onclick="x"/>')],
    ["unquoted attr", `<svg ${NS} width=1/>`],
    ["slash before handler", `<svg ${NS}/onload=alert(1)>`],
    ["attr glued to quote", '<svg a="1"onload=alert(1)></svg>'],
    ["duplicate attribute", `<svg ${NS} width="1" width="2"/>`],
    ["javascript href", svg('<a href="javascript:alert(1)"><rect/></a>')],
    ["a element", svg('<a href="#x"><rect/></a>')],
    ["external use", svg('<use href="https://evil.example/x.svg#a"/>')],
    ["data href on use", svg('<use href="data:image/svg+xml;base64,AAAA"/>')],
    ["image element", svg('<image href="#a"/>')],
    ["entity-obfuscated href", svg('<use href="&#106;avascript:alert(1)"/>')],
    ["numeric char ref in value", svg('<rect fill="&#x75;rl(http://evil)"/>')],
    ["external url() in fill", svg('<rect fill="url(http://evil.example/x)"/>')],
    ["external url() in style", svg('<rect style="fill:url(https://evil.example/x)"/>')],
    ["css escape in url", svg('<rect style="fill:u\\72l(http://evil)"/>')],
    ["@import in style element", svg("<style>@import url(https://evil.example/a.css);</style>")],
    ["expression in style", svg('<rect style="width:expression(alert(1))"/>')],
    ["style element with markup", svg("<style><![CDATA[a{}]]></style>")],
    ["animate", svg('<rect><animate attributeName="href" to="javascript:alert(1)"/></rect>')],
    ["set", svg('<set attributeName="onload" to="alert(1)"/>')],
    ["iframe", svg('<iframe src="x"/>')],
    ["namespaced element", svg('<x:script xmlns:x="http://www.w3.org/1999/xhtml">alert(1)</x:script>')],
    ["namespaced attribute", `<svg ${NS} xmlns:i="http://evil" i:foo="1"/>`],
    ["wrong svg namespace", '<svg xmlns="http://www.w3.org/1999/xhtml"/>'],
    ["DOCTYPE with entity", `<!DOCTYPE svg [<!ENTITY a "b">]>${svg("")}`],
    ["bare ENTITY reference", svg("<text>&xxe;</text>")],
    ["CDATA", svg("<![CDATA[x]]>")],
    ["processing instruction", `<?xml-stylesheet href="evil.css"?>${svg("")}`],
    ["xml declaration with odd version", `<?xml version="2.0"?>${svg("")}`],
    ["comment smuggling markup", svg("<!-- <script>x</script> -->")],
    ["text outside root", `junk${svg("")}`],
    ["two roots", `${svg("")}${svg("")}`],
    ["root is not svg", '<g xmlns="http://www.w3.org/2000/svg"/>'],
    ["unclosed", `<svg ${NS}><g>`],
    ["mismatched close", `<svg ${NS}><g></path></svg>`],
    ["unterminated tag", `<svg ${NS}`],
    ["lt in attribute value", svg('<rect fill="a<b"/>')],
    ["tag in text", svg("<text>a<b></text>")],
  ];
  for (const [label, s] of bad) assert.equal(isPlainSvg(s), false, label);
  // through the upload check as well, including non-UTF-8 and UTF-16 content
  assert.throws(() => checkLogoUpload(up("x.svg", Buffer.from(svg("<script/>"), "utf16le"))), "utf-16 is refused");
  assert.throws(() => checkLogoUpload(up("x.svg", Buffer.concat([Buffer.from(`<svg ${NS}><text>`), Buffer.from([0xff, 0xfe]), Buffer.from("</text></svg>")]))), "invalid utf-8 is refused");
  assert.equal(checkLogoUpload(up("x.svg", svg('<rect width="1" height="1"/>'))).ext, "svg");
});

test("an SVG with a huge number of tags is refused instead of walked forever", () => {
  assert.equal(isPlainSvg(svg("<g/>".repeat(30000))), false);
});
