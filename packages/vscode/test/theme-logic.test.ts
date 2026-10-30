import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS, STORAGE_KEY, applyPreset, clampRadius, contrastRatio, cssVars, exportTheme, importTheme,
  isHex, loadSettings, lowContrast, pickForeground, sanitize, saveSettings,
} from "../../ui/src/theme/logic.ts";

test("hex validation accepts only #rrggbb", () => {
  assert.ok(isHex("#0a1B2c"));
  for (const bad of ["#fff", "0a1b2c", "#12345g", "#1234567", "red", "", 5, null, "#ffffff;", "url(x)", "#fffff}", " #ffffff", "#ffffff\n"]) assert.equal(isHex(bad), false, String(bad));
});

test("injection strings never reach cssVars", () => {
  const evil = ["url(http://x)", "#fff; background:url(x)", "#ffffff}body{display:none", "#ffffff;"];
  for (const v of evil) assert.deepEqual(cssVars({ mode: "system", tokens: { primary: v, card: v } }), {});
  const s = sanitize({ mode: "dark", tokens: { primary: "#ffffff;", accent: "#123456" }, radius: 4 });
  assert.deepEqual(s.tokens, { accent: "#123456" });
});

test("radius is clamped to 0-20 and non numbers dropped", () => {
  assert.equal(clampRadius(99), 20);
  assert.equal(clampRadius(-3), 0);
  assert.equal(clampRadius("8"), 8);
  assert.equal(clampRadius("abc"), undefined);
  assert.equal(clampRadius(NaN), undefined);
  assert.equal(cssVars({ mode: "system", tokens: {}, radius: 50 })["--radius"], "20px");
});

test("contrast ratio matches WCAG known values", () => {
  assert.equal(contrastRatio("#000000", "#ffffff").toFixed(2), "21.00");
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
  assert.ok(Number.isNaN(contrastRatio("red", "#ffffff")));
  assert.equal(lowContrast("#777777", "#ffffff"), true);
  assert.equal(lowContrast("#000000", "#ffffff"), false);
});

test("foreground pick: white on dark primary, black on light primary", () => {
  assert.equal(pickForeground("#2563eb"), "#ffffff");
  assert.equal(pickForeground("#facc15"), "#000000");
  assert.equal(cssVars({ mode: "system", tokens: { primary: "#facc15" } })["--primary-foreground"], "#000000");
  for (const p of Object.values(PRESETS)) if (p.primary) assert.ok(contrastRatio(pickForeground(p.primary), p.primary) >= 4.5, p.label);
});

test("preset sets primary only; neutral clears", () => {
  const s = applyPreset({ mode: "dark", tokens: { card: "#111111" } }, "green");
  assert.deepEqual(s, { mode: "dark", tokens: { primary: "#16a34a" } });
  assert.deepEqual(applyPreset(s, "neutral").tokens, {});
  assert.equal(applyPreset(s, "nope"), s);
});

test("import drops unknown keys, rejects invalid values and wrong files", () => {
  const ok = importTheme(JSON.stringify({ format: "gitask-theme", version: 1, tokens: { primary: "#ABCDEF", evil: "#000000", "--x": "1" }, radius: 40, extra: 1 }));
  assert.deepEqual(ok, { ok: true, settings: { tokens: { primary: "#abcdef" }, radius: 20 } });
  assert.equal(importTheme(JSON.stringify({ format: "gitask-theme", tokens: { primary: "url(x)" } })).ok, false);
  assert.equal(importTheme(JSON.stringify({ tokens: { primary: "#000000" } })).ok, false);
  assert.equal(importTheme("[1]").ok, false);
  assert.equal(importTheme("{nope").ok, false);
  assert.equal(importTheme(JSON.stringify({ format: "gitask-theme", radius: "8" })).ok, false);
});

test("export then import round trips", () => {
  const s = { mode: "dark" as const, tokens: { primary: "#2563eb", border: "#cccccc" }, radius: 6 };
  const r = importTheme(exportTheme(s));
  assert.deepEqual(r, { ok: true, settings: { tokens: s.tokens, radius: 6 } });
});

test("persistence: save, load, corrupt and throwing storage", () => {
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  const s = { mode: "light" as const, tokens: { card: "#fafafa" }, radius: 3 };
  assert.equal(saveSettings(store, s), true);
  assert.deepEqual(loadSettings(store), s);
  mem.set(STORAGE_KEY, "{bad");
  assert.deepEqual(loadSettings(store), { mode: "system", tokens: {} });
  mem.set(STORAGE_KEY, JSON.stringify({ mode: "neon", tokens: { primary: "javascript:1" } }));
  assert.deepEqual(loadSettings(store), { mode: "system", tokens: {} });
  const boom = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
  assert.deepEqual(loadSettings(boom), { mode: "system", tokens: {} });
  assert.equal(saveSettings(boom, s), false);
  assert.deepEqual(loadSettings(undefined), { mode: "system", tokens: {} });
});
