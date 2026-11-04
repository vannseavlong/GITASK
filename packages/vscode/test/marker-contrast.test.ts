import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The tab drop marker is `bg-foreground`. WCAG 1.4.11 wants 3:1 against what is behind it (non-text UI).
// Values are the CSS fallbacks in packages/ui/src/index.css; VS Code overrides them with the live theme tokens.
const css = readFileSync(new URL("../../ui/src/index.css", import.meta.url), "utf8");

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
export const ratio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** Fallback of `--name: var(--vscode-x, #fff)` in the light :root block, or the hex in a dark block. */
const light = (name: string): string => css.match(new RegExp(`--${name}: var\\(--vscode-[\\w-]+, (#[0-9a-fA-F]{6})`))![1]!;
const dark = (name: string): string => css.match(new RegExp(`:root:not\\(\\.vscode-theme\\) \\{[^}]*--${name}: (#[0-9a-fA-F]{6})`))![1]!;

const cases: [string, string, string][] = [
  ["light / background", light("foreground"), light("background")],
  ["light / sidebar", light("foreground"), light("sidebar")],
  ["light / accent (hover)", light("foreground"), light("accent")],
  ["dark / background", dark("foreground"), dark("background")],
  ["dark / sidebar", dark("foreground"), dark("sidebar")],
  ["dark / accent (hover)", dark("foreground"), dark("accent")],
  // High contrast has no fallback in the CSS: VS Code supplies --vscode-foreground. Its built-in HC themes are #ffffff on #000000 (HC light: #000000 on #ffffff).
  ["high-contrast dark / background", "#ffffff", "#000000"],
  ["high-contrast light / background", "#000000", "#ffffff"],
];

test("tab drop marker (foreground) has at least 3:1 against every theme background", () => {
  for (const [name, fg, bg] of cases) {
    const r = ratio(fg, bg);
    console.log(`${name}: ${fg} on ${bg} = ${r.toFixed(2)}:1`);
    assert.ok(r >= 3, `${name} is ${r.toFixed(2)}:1, under 3:1`);
  }
});
