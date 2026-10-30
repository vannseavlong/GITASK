import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { THEME_INIT } from "../src/serve.ts";

function run(stored: string | null, dark = false) {
  const props: Record<string, string> = {}; const attrs: Record<string, string> = {}; let isDark = false;
  const root = { setAttribute: (k: string, v: string) => { attrs[k] = v; }, classList: { toggle: (_: string, on: boolean) => { isDark = on; } }, style: { setProperty: (k: string, v: string) => { props[k] = v; } } };
  vm.runInNewContext(THEME_INIT, { document: { documentElement: root }, localStorage: { getItem: () => stored }, matchMedia: () => ({ matches: dark }) });
  return { props, attrs, isDark };
}

test("theme init applies saved mode and valid colours only", () => {
  const r = run(JSON.stringify({ mode: "dark", tokens: { primary: "#2563eb", card: "url(x)", border: "#ffffff;", evil: "#000000" } }));
  assert.equal(r.attrs["data-theme"], "dark");
  assert.equal(r.isDark, true);
  assert.equal(r.props["--primary"], "#2563eb");
  assert.equal(r.props["--card"], undefined);
  assert.equal(r.props["--border"], undefined);
  assert.deepEqual(Object.keys(r.props).sort(), ["--primary", "--progress", "--ring", "color-scheme"]);
});

test("theme init resolves system to the OS preference and survives bad storage", () => {
  assert.equal(run(null, true).attrs["data-theme"], "dark");
  assert.equal(run("{bad", false).attrs["data-theme"], "light");
  assert.equal(run(JSON.stringify({ mode: "neon" }), true).attrs["data-theme"], "dark");
});
