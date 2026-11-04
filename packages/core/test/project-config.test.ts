import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBoard, parseProject, readProject, setProject, isLogoPath, resolveLogo, MAX_LOGO_BYTES } from "../src/index.ts";

const DEFAULTS = { align: "left", size: "md", logoPosition: "left", showTitle: true };

function setup(git = false) {
  const root = mkdtempSync(join(tmpdir(), "gitask-proj-"));
  const tasks = join(root, "Tasks");
  mkdirSync(join(tasks, "1-backlog"), { recursive: true });
  mkdirSync(join(tasks, "assets"));
  writeFileSync(join(tasks, "logo.png"), "png-bytes");
  if (git) {
    const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
    g("init", "-q", "-b", "main");
    g("config", "user.email", "t@t.t");
    g("config", "user.name", "T");
    writeFileSync(join(tasks, "gitask.json"), '{"other":1,"project":{"future":"keep"}}\n');
    g("add", "-A");
    g("commit", "-q", "-m", "init");
  }
  return { root, tasks };
}
const cfg = (tasks: string, v: unknown) => writeFileSync(join(tasks, "gitask.json"), typeof v === "string" ? v : JSON.stringify(v));

test("parseProject: defaults for missing, malformed and wrong-typed input", () => {
  for (const t of ["", "not json", "[]", "null", "{}", '{"project":5}', '{"project":[]}', '{"project":null}']) {
    assert.deepEqual(parseProject(t), { layout: DEFAULTS }, t);
  }
  const p = parseProject(JSON.stringify({ project: { title: 5, subtitle: {}, logo: 7, layout: { align: "middle", size: 3, logoPosition: "bottom", showTitle: "yes" } } }));
  assert.deepEqual(p, { layout: DEFAULTS });
});

test("parseProject: good values, trimmed; each bad layout field falls back alone", () => {
  const p = parseProject(JSON.stringify({ project: { title: "  Acme  ", subtitle: "Plans", logo: "assets/a.SVG", layout: { align: "center", size: "lg", logoPosition: "nope", showTitle: false } } }));
  assert.deepEqual(p, { title: "Acme", subtitle: "Plans", logo: "assets/a.SVG", layout: { align: "center", size: "lg", logoPosition: "left", showTitle: false } });
});

test("parseProject: control characters and bidi marks are replaced, length is capped", () => {
  const p = parseProject(JSON.stringify({ project: { title: "A\nB\u202eC\u0000D", subtitle: "x".repeat(500) } }));
  assert.equal(p.title, "A B C D");
  assert.equal(p.subtitle?.length, 160);
  assert.equal(parseProject(JSON.stringify({ project: { title: "\n\t " } })).title, undefined);
  assert.equal(parseProject(JSON.stringify({ project: { title: "\u{1F468}\u200d\u{1F469}" } })).title, "\u{1F468}\u200d\u{1F469}");
  assert.equal(parseProject(JSON.stringify({ project: { title: "y".repeat(500) } })).title?.length, 80);
});

test("parseProject: a __proto__ key stays data and prototype names are not read as settings", () => {
  const p = parseProject('{"project":{"__proto__":{"title":"x"},"layout":{"__proto__":{"align":"right"}}}}');
  assert.deepEqual(p, { layout: DEFAULTS });
  assert.equal(({} as Record<string, unknown>).title, undefined);
});

test("isLogoPath: allow-list and hostile paths", () => {
  for (const ok of ["logo.png", "a/b/c.jpg", "x.JPEG", "l.webp", "l.gif", "l.svg", "my logo.png"]) assert.equal(isLogoPath(ok), true, ok);
  const bad = ["", "../logo.png", "a/../../logo.png", "a/./b.png", "/etc/passwd.png", "C:/x.png", "C:\\x.png", "a\\b.png", "a//b.png", "a/", ".png", "logo.exe", "logo", "logo.png.html", "logo.html", "gitask.json", "x.png\0", "x.png\n", "file:///x.png", "http://x/y.png", "a".repeat(300) + ".png", "dir/.svg"];
  for (const b of bad) assert.equal(isLogoPath(b), false, JSON.stringify(b));
  for (const n of [null, undefined, 5, {}, ["a.png"]]) assert.equal(isLogoPath(n), false);
});

test("readProject: a good logo resolves to path + mime and no bytes", async () => {
  const { tasks } = setup();
  cfg(tasks, { project: { title: "Acme", logo: "logo.png" } });
  const p = await readProject(tasks);
  assert.deepEqual(p, { title: "Acme", logo: { path: "logo.png", mime: "image/png" }, layout: DEFAULTS });
  const board = await loadBoard(tasks);
  assert.deepEqual(board.project, p);
  assert.ok(!JSON.stringify(board.project).includes("png-bytes"));
});

test("readProject: nothing set means no project; missing config means none", async () => {
  const { tasks } = setup();
  assert.equal(await readProject(tasks), undefined);
  assert.equal((await loadBoard(tasks)).project, undefined);
  assert.ok(!("project" in (await loadBoard(tasks))));
  cfg(tasks, { project: { layout: { align: "right" } } });
  assert.equal(await readProject(tasks), undefined);
  cfg(tasks, "{broken");
  assert.equal(await readProject(tasks), undefined);
});

test("readProject: missing, traversing and wrong-type logos are dropped, title kept", async () => {
  const { root, tasks } = setup();
  writeFileSync(join(root, "outside.png"), "secret");
  writeFileSync(join(tasks, "notes.md"), "x");
  mkdirSync(join(tasks, "dir.png"));
  for (const logo of ["missing.png", "../outside.png", "../../etc/passwd", join(root, "outside.png"), "notes.md", "dir.png", "gitask.json", 5, ""]) {
    cfg(tasks, { project: { title: "T", logo } });
    assert.deepEqual(await readProject(tasks), { title: "T", layout: DEFAULTS }, String(logo));
  }
});

test("readProject: a symlinked logo (file or folder) or symlinked config is refused", async () => {
  const { root, tasks } = setup();
  writeFileSync(join(root, "outside.png"), "secret");
  mkdirSync(join(root, "elsewhere"));
  writeFileSync(join(root, "elsewhere", "l.png"), "secret");
  symlinkSync(join(root, "outside.png"), join(tasks, "link.png"));
  symlinkSync(join(root, "elsewhere"), join(tasks, "linkdir"));
  symlinkSync(join(tasks, "logo.png"), join(tasks, "inside-link.png")); // even a link that stays inside is refused
  for (const logo of ["link.png", "linkdir/l.png", "inside-link.png"]) {
    cfg(tasks, { project: { title: "T", logo } });
    assert.equal((await readProject(tasks))?.logo, undefined, logo);
    await assert.rejects(resolveLogo(tasks, logo));
  }
  writeFileSync(join(root, "real.json"), JSON.stringify({ project: { title: "from link" } }));
  execFileSync("rm", [join(tasks, "gitask.json")]);
  symlinkSync(join(root, "real.json"), join(tasks, "gitask.json"));
  assert.equal(await readProject(tasks), undefined);
  await assert.rejects(setProject(tasks, { title: "x" }));
  assert.equal(JSON.parse(readFileSync(join(root, "real.json"), "utf8")).project.title, "from link");
});

test("readProject: size cap and empty file", async () => {
  const { tasks } = setup();
  writeFileSync(join(tasks, "big.png"), Buffer.alloc(MAX_LOGO_BYTES + 1));
  writeFileSync(join(tasks, "edge.png"), Buffer.alloc(MAX_LOGO_BYTES));
  writeFileSync(join(tasks, "empty.png"), "");
  await assert.rejects(resolveLogo(tasks, "big.png"), /larger/);
  await assert.rejects(resolveLogo(tasks, "empty.png"), /empty/);
  assert.equal((await resolveLogo(tasks, "edge.png")).mime, "image/png");
  cfg(tasks, { project: { title: "T", logo: "big.png" } });
  assert.equal((await readProject(tasks))?.logo, undefined);
});

test("readProject: svg is allowed and typed as svg+xml (rendered only via <img>)", async () => {
  const { tasks } = setup();
  writeFileSync(join(tasks, "assets", "l.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  cfg(tasks, { project: { logo: "assets/l.svg" } });
  assert.deepEqual((await readProject(tasks))?.logo, { path: "assets/l.svg", mime: "image/svg+xml" });
});

test("setProject: writes, merges layout, keeps unrelated and unknown keys, clears with null", async () => {
  const { tasks } = setup();
  cfg(tasks, { other: 1, columns: { "1-backlog": { color: "#112233" } }, project: { future: "keep", layout: { custom: 1 } } });
  await setProject(tasks, { title: " Acme ", subtitle: "Sub", logo: "logo.png", layout: { align: "center" } });
  await setProject(tasks, { layout: { size: "lg", showTitle: false } });
  let j = JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8"));
  assert.equal(j.other, 1);
  assert.equal(j.columns["1-backlog"].color, "#112233");
  assert.deepEqual(j.project, { future: "keep", title: "Acme", subtitle: "Sub", logo: "logo.png", layout: { custom: 1, align: "center", size: "lg", showTitle: false } });
  await setProject(tasks, { title: null, subtitle: null, logo: null });
  j = JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8"));
  assert.deepEqual(Object.keys(j.project).sort(), ["future", "layout"]);
  assert.equal(await readProject(tasks), undefined);
});

test("setProject: creates the file; empty project block is removed", async () => {
  const { tasks } = setup();
  const r = await setProject(tasks, { title: "Acme" });
  assert.equal(r.committed, false);
  assert.equal(JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8")).project.title, "Acme");
  await setProject(tasks, { title: null });
  assert.deepEqual(JSON.parse(readFileSync(join(tasks, "gitask.json"), "utf8")), {});
});

test("setProject: rejects bad input and writes nothing", async () => {
  const { root, tasks } = setup();
  writeFileSync(join(root, "outside.png"), "x");
  cfg(tasks, { project: { title: "Keep" } });
  const before = readFileSync(join(tasks, "gitask.json"), "utf8");
  const bad: unknown[] = [
    { layout: { align: "middle" } },
    { layout: { size: "xl" } },
    { layout: { logoPosition: "bottom" } },
    { layout: { showTitle: "yes" } },
    { layout: { colour: "red" } },
    { layout: [] },
    { title: "x".repeat(81) },
    { subtitle: "x".repeat(161) },
    { title: "a\nb" },
    { title: 5 },
    { logo: "../outside.png" },
    { logo: "missing.png" },
    { logo: "notes.exe" },
    { logo: 5 },
    { nonsense: 1 },
    { title: "ok", layout: { align: "bad" } },
    [],
    null,
  ];
  for (const b of bad) await assert.rejects(setProject(tasks, b as never), Error, JSON.stringify(b));
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), before);
});

test("setProject: refuses to overwrite an unreadable config", async () => {
  const { tasks } = setup();
  cfg(tasks, "{broken");
  await assert.rejects(setProject(tasks, { title: "x" }));
  assert.equal(readFileSync(join(tasks, "gitask.json"), "utf8"), "{broken");
  cfg(tasks, "[]");
  await assert.rejects(setProject(tasks, { title: "x" }));
});

test("setProject commits Tasks/gitask.json only, and only when tracked", async () => {
  const { root, tasks } = setup(true);
  writeFileSync(join(root, "dirty.txt"), "x");
  execFileSync("git", ["add", "dirty.txt"], { cwd: root });
  writeFileSync(join(tasks, "untracked.png"), "x");
  const r = await setProject(tasks, { title: "Acme", logo: "untracked.png" });
  assert.equal(r.committed, true);
  const files = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: root }).toString();
  assert.equal(files.trim(), "Tasks/gitask.json");
  assert.match(execFileSync("git", ["status", "--porcelain"], { cwd: root }).toString(), /A  dirty\.txt/);
  const none = await setProject(tasks, { title: "B" }, { commit: false });
  assert.equal(none.committed, false);
});

test("setProject does not commit an untracked config", async () => {
  const { root, tasks } = setup(true);
  execFileSync("git", ["rm", "-q", "--cached", "Tasks/gitask.json"], { cwd: root });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString();
  assert.equal((await setProject(tasks, { title: "x" })).committed, false);
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root }).toString(), head);
});

test("setProject with the same values twice does not fail on an empty commit", async () => {
  const { tasks } = setup(true);
  assert.equal((await setProject(tasks, { title: "Acme" })).committed, true);
  assert.equal((await setProject(tasks, { title: "Acme" })).committed, false);
});

test("a title of only zero-width characters is not a title", () => {
  const zw = String.fromCharCode(0x200b, 0x2060, 0xfeff);
  assert.equal(parseProject(JSON.stringify({ project: { title: zw } })).title, undefined);
});

test("setProject never parses a symlinked gitask.json", async () => {
  const { root, tasks } = setup();
  writeFileSync(join(root, "outside.json"), "SECRET-NOT-JSON");
  symlinkSync(join(root, "outside.json"), join(tasks, "gitask.json"));
  await assert.rejects(setProject(tasks, { title: "x" }), (e: Error) => !/SECRET/.test(e.message));
});

test("readLogoBytes: serves the configured logo, and re-checks it at serve time", async () => {
  const { tasks } = setup();
  const { readLogoBytes, logoDataUrl } = await import("../src/index.ts");
  assert.equal(await readLogoBytes(tasks), undefined, "no config");
  cfg(tasks, { project: { title: "A", logo: "logo.png" } });
  const got = await readLogoBytes(tasks);
  assert.equal(got?.mime, "image/png");
  assert.equal(got?.bytes.toString(), "png-bytes");
  assert.equal(logoDataUrl(got!), `data:image/png;base64,${Buffer.from("png-bytes").toString("base64")}`);
  // swapped for a symlink after the board loaded: not followed
  const secret = join(tasks, "..", "secret.png");
  writeFileSync(secret, "secret");
  rmSync(join(tasks, "logo.png"));
  symlinkSync(secret, join(tasks, "logo.png"));
  assert.equal(await readLogoBytes(tasks), undefined);
  // grown past the cap after the board loaded
  rmSync(join(tasks, "logo.png"));
  writeFileSync(join(tasks, "logo.png"), Buffer.alloc(MAX_LOGO_BYTES + 1));
  assert.equal(await readLogoBytes(tasks), undefined);
  // config points at a non-image: dropped by readProject
  cfg(tasks, { project: { title: "A", logo: "gitask.json" } });
  assert.equal(await readLogoBytes(tasks), undefined);
});
