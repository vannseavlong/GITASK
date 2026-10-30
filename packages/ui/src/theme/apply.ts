import { ALL_VARS, cssVars, type ThemeSettings } from "./logic.ts";

/** Write a theme onto <html>. Values come from `cssVars`, which validates them; nothing is ever set as CSS text. */
export function applyTheme(s: ThemeSettings, root: HTMLElement = document.documentElement): void {
  for (const name of ALL_VARS) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(cssVars(s))) root.style.setProperty(name, value);
  // "System" resolves to the OS preference here so the browser always uses the explicit token sets in index.css.
  const resolved = s.mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : s.mode;
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
  root.style.setProperty("color-scheme", resolved);
}

/** Current computed value of a token as `#rrggbb` (falls back to black when the browser reports something else). */
export function computedHex(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  const m = /^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(raw);
  return m ? "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "#000000";
}
