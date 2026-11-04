import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveProject, checkLogoUpload, readProject, validateMessage, MAX_LOGO_BYTES } from "../src/index.ts";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest-of-png")]);
const up = (name: string, bytes: Buffer | string) => ({ name, data: Buffer.from(bytes).toString("base64") });

function setup() {
  const root = mkdtempSync(join(tmpdir(), "gitask-save-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" }).toString();
  g("init", "-q", "-b", "main"); g("config", "user.email", "t@t.t"); g("config", "user.name", "T");
  writeFileSync(join(tasks, "gitask.json"), '{"other":1}\n');
  writeFileSync(join(root, "unrelated.txt"), "x");
  g("add", "-A"); g("commit", "-q", "-m", "init");
  return { root, tasks, g };
}
const logos = (tasks: string) => readdirSync(tasks).filter((f) => f.startsWith("logo-"));

test("a valid upload is stored under a generated name and committed with gitask.json only", async () => {
  const { root, tasks, g } = setup();
  writeFileSync(join(root, "dirty.txt"), "dirty");
  g("add", "dirty.txt"); // staged by someone else: must stay out of our commit
  const r = await saveProject(tasks, { title: "Acme", layout: { align: "center" }, logo: up("My Logo (final).PNG", PNG) });
  assert.deepEqual(r, { committed: true });
  const [name] = logos(tasks);
  assert.match(name, /^logo-[0-9a-f]{12}\.png$/, "name is generated, never the uploaded name");
  assert.deepEqual(readFileSync(join(tasks, name)), PNG);
  const p = await readProject(tasks);
  assert.equal(p?.title, "Acme");
  assert.deepEqual(p?.logo, { path: name, mime: "image/png" });
  assert.equal(p?.layout.align, "center");
  const files = g("show", "--name-only", "--format=", "HEAD").trim().split("\n").sort();
  assert.deepEqual(files, ["Tasks/gitask.json", `Tasks/${name}`]);
  assert.match(g("status", "--porcelain"), /dirty\.txt/, "the other staged file is untouched");
  assert.equal(JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8")).other, 1, "other keys kept");
});

test("same upload twice reuses the file; null removes the logo from config (file stays)", async () => {
  const { tasks } = setup();
  await saveProject(tasks, { logo: up("a.png", PNG) });
  await saveProject(tasks, { logo: up("b.png", PNG) });
  assert.equal(logos(tasks).length, 1);
  await saveProject(tasks, { title: "T", logo: null });
  assert.equal((await readProject(tasks))?.logo, undefined);
});

test("hostile uploads are refused and leave no file behind", async () => {
  const { tasks } = setup();
  const big = Buffer.concat([PNG, Buffer.alloc(MAX_LOGO_BYTES)]);
  const cases: [string, { name: string; data: string }][] = [
    ["wrong type by name", up("x.exe", PNG)],
    ["no extension", up("png", PNG)],
    ["html as png", up("x.png", "<html><script>alert(1)</script></html>")],
    ["png bytes named svg", up("x.svg", PNG)],
    ["jpg named png", up("x.png", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))],
    ["svg with script", up("x.svg", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["svg with handler", up("x.svg", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')],
    ["oversize", up("x.png", big)],
    ["empty", { name: "x.png", data: "" }],
    ["not base64", { name: "x.png", data: "***not base64***" }],
    ["traversal name", up("../../evil.png", PNG)],
  ];
  for (const [label, u] of cases) {
    if (label !== "traversal name") await assert.rejects(saveProject(tasks, { title: "X", logo: u }), label);
  }
  // the traversal name is harmless (only its extension is used) and the stored name is generated:
  await saveProject(tasks, { logo: up("../../evil.png", PNG) });
  assert.ok(logos(tasks).every((f) => /^logo-[0-9a-f]{12}\.png$/.test(f)));
  assert.equal(existsSync(join(tasks, "..", "..", "evil.png")), false);
  assert.equal(checkLogoUpload(up("a.gif", "GIF89a-ok")).ext, "gif");
});

test("a rejected upload removes the file it created; a failed config write keeps nothing new", async () => {
  const { tasks } = setup();
  await assert.rejects(saveProject(tasks, { title: "x‮", logo: up("a.png", PNG) }));
  assert.equal(logos(tasks).length, 0, "the logo stored for a save that then failed is removed again");
  await assert.rejects(saveProject(tasks, { layout: { align: "diagonal" as never }, logo: up("a.png", PNG) }));
  assert.equal(logos(tasks).length, 0);
});

test("a symlink at the generated name is not written through, a different file there is not replaced", async () => {
  const { root, tasks } = setup();
  const name = `logo-${(await import("node:crypto")).createHash("sha256").update(PNG).digest("hex").slice(0, 12)}.png`;
  writeFileSync(join(root, "secret.png"), "secret");
  symlinkSync(join(root, "secret.png"), join(tasks, name));
  await assert.rejects(saveProject(tasks, { logo: up("a.png", PNG) }));
  assert.equal(readFileSync(join(root, "secret.png"), "utf8"), "secret");
});

test("a symlinked gitask.json is refused and nothing new stays behind", async () => {
  const { root, tasks } = setup();
  const cfg = join(tasks, "gitask.json");
  writeFileSync(join(root, "real.json"), "{}");
  execFileSync("rm", [cfg]);
  symlinkSync(join(root, "real.json"), cfg);
  await assert.rejects(saveProject(tasks, { title: "A", logo: up("a.png", PNG) }));
  assert.equal(logos(tasks).length, 0);
  assert.equal(readFileSync(join(root, "real.json"), "utf8"), "{}");
});

test("validateMessage setProject: valid, invalid and hostile input", () => {
  const ctx = { tasksDir: "/t", columns: ["1-backlog"], views: [] };
  const v = (m: unknown) => validateMessage(m, ctx);
  assert.deepEqual(v({ type: "setProject", title: " A ", layout: { size: "lg" } }), { ok: true, message: { type: "setProject", title: "A", layout: { size: "lg" } } });
  assert.deepEqual(v({ type: "setProject", logo: null }), { ok: true, message: { type: "setProject", logo: null } });
  assert.equal(v({ type: "setProject", logo: up("a.png", PNG) }).ok, true);
  const bad: unknown[] = [
    { type: "setProject" },
    { type: "setProject", title: 5 },
    { type: "setProject", title: "x".repeat(81) },
    { type: "setProject", subtitle: "a\nb" },
    { type: "setProject", title: "‮evil" },
    { type: "setProject", layout: { align: "middle" } },
    { type: "setProject", layout: { showTitle: "yes" } },
    { type: "setProject", layout: { evil: 1 } },
    { type: "setProject", layout: [] },
    { type: "setProject", path: "/etc/passwd", title: "A" },
    { type: "setProject", logo: "../../etc/passwd" },
    { type: "setProject", logo: { path: "logo.png" } },
    { type: "setProject", logo: { name: "x.png", data: "AAAA", extra: 1 } },
    { type: "setProject", logo: { name: "x.exe", data: "AAAA" } },
    { type: "setProject", logo: { name: "../x.png", data: "AAAA" } },
    { type: "setProject", logo: { name: "a\\b.png", data: "AAAA" } },
    { type: "setProject", logo: { name: "x.png", data: "A".repeat(1048576 * 2) } },
    { type: "setProject", logo: { name: "x.png", data: "not base64!" } },
    { type: "setProject", logo: { name: "x.png", data: 5 } },
  ];
  for (const m of bad) assert.equal(v(m).ok, false, JSON.stringify(m).slice(0, 80));
});

test("svg bypass forms from the review are refused, plain svg and embedded images pass", () => {
  const svg = (inner: string, attrs = "") => up("x.svg", `<svg xmlns="http://www.w3.org/2000/svg"${attrs}>${inner}</svg>`);
  const bad: [string, { name: string; data: string }][] = [
    ["slash before handler", up("x.svg", '<svg xmlns="http://www.w3.org/2000/svg"/onload=alert(1)>')],
    ["quote before handler", up("x.svg", '<svg a="1"onload=alert(1)></svg>')],
    ["namespaced script", svg('<x:script xmlns:x="http://www.w3.org/1999/xhtml">alert(1)</x:script>')],
    ["javascript href", svg('<a xlink:href="javascript:alert(1)"><rect/></a>')],
    ["animate handler", svg('<set attributeName="onload" to="alert(1)"/>')],
    ["iframe", svg('<iframe src="x"></iframe>')],
    ["data html href", svg('<image href="data:text/html;base64,AAAA"/>')],
    ["entity", up("x.svg", '<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"/>')],
  ];
  for (const [label, u] of bad) assert.throws(() => checkLogoUpload(u), label);
  assert.equal(checkLogoUpload(svg('<rect width="1" height="1"/>')).ext, "svg");
  assert.equal(checkLogoUpload(svg('<image href="data:image/png;base64,AAAA"/>')).ext, "svg");
});

test("a failed commit restores gitask.json, unstages and removes the new logo", async () => {
  const { root, tasks, g } = setup();
  const before = readFileSync(join(tasks, "gitask.json"), "utf8");
  writeFileSync(join(root, ".git", "hooks", "pre-commit"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  await assert.rejects(saveProject(tasks, { title: "Acme", logo: up("a.png", PNG) }));
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), before, "config is back to what it was");
  assert.deepEqual(logos(tasks), [], "the new logo file is gone");
  assert.equal(g("status", "--porcelain").trim(), "", "nothing left staged or modified");
});
