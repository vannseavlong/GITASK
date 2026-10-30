/**
 * Browser theme logic: pure, no DOM and no React, so node:test can import it.
 * Every value that can reach the page is validated here first; the UI applies the result only through
 * `document.documentElement.style.setProperty`, never as CSS text.
 */

export const STORAGE_KEY = "gitask.theme";
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const RADIUS_MIN = 0;
export const RADIUS_MAX = 20;

export type ThemeMode = "system" | "light" | "dark";
export const MODES: readonly ThemeMode[] = ["system", "light", "dark"];

export const TOKEN_KEYS = ["primary", "accent", "background", "card", "border"] as const;
export type TokenKey = (typeof TOKEN_KEYS)[number];

export interface ThemeSettings {
  mode: ThemeMode;
  tokens: Partial<Record<TokenKey, string>>;
  radius?: number;
}

export const DEFAULT_SETTINGS: ThemeSettings = { mode: "system", tokens: {} };

/** Which CSS variables each custom token drives. */
const VARS: Record<TokenKey, readonly string[]> = {
  primary: ["--primary", "--primary-foreground", "--ring", "--progress"],
  accent: ["--accent"],
  background: ["--background"],
  card: ["--card", "--popover"],
  border: ["--border", "--input-border"],
};
export const ALL_VARS: readonly string[] = [...Object.values(VARS).flat(), "--radius"];

export const PRESETS: Record<string, { label: string; primary?: string }> = {
  neutral: { label: "Neutral" },
  blue: { label: "Blue", primary: "#2563eb" },
  green: { label: "Green", primary: "#16a34a" },
  violet: { label: "Violet", primary: "#7c3aed" },
  orange: { label: "Orange", primary: "#ea580c" },
  red: { label: "Red", primary: "#dc2626" },
};

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX_RE.test(v);
}

/** Clamp to 0-20. Non numbers return undefined (no override). */
export function clampRadius(v: unknown): number | undefined {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, n));
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio, 1 to 21. NaN when either colour is not `#rrggbb`. */
export function contrastRatio(fg: string, bg: string): number {
  if (!isHex(fg) || !isHex(bg)) return NaN;
  const [a, b] = [luminance(fg), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Black or white, whichever reads better on `bg`. */
export function pickForeground(bg: string): "#000000" | "#ffffff" {
  return contrastRatio("#000000", bg) >= contrastRatio("#ffffff", bg) ? "#000000" : "#ffffff";
}

/** True when text on primary falls below the WCAG AA 4.5:1 limit. */
export function lowContrast(fg: string, bg: string): boolean {
  const r = contrastRatio(fg, bg);
  return Number.isFinite(r) && r < 4.5;
}

/** The only CSS variable writes the UI may make: names from our table, values already validated. */
export function cssVars(s: ThemeSettings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of TOKEN_KEYS) {
    const v = s.tokens[k];
    if (!isHex(v)) continue;
    for (const name of VARS[k]) out[name] = name === "--primary-foreground" ? pickForeground(v) : v;
  }
  const r = clampRadius(s.radius);
  if (r !== undefined) out["--radius"] = `${r}px`;
  return out;
}

export function applyPreset(s: ThemeSettings, id: string): ThemeSettings {
  const p = PRESETS[id];
  if (!p) return s;
  return { ...s, tokens: p.primary ? { primary: p.primary } : {} };
}

/** Lenient: keep what is valid, drop the rest. Used for localStorage, which anyone can edit. */
export function sanitize(raw: unknown): ThemeSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const mode = MODES.includes(o.mode as ThemeMode) ? (o.mode as ThemeMode) : "system";
  const tokens: ThemeSettings["tokens"] = {};
  const t = o.tokens && typeof o.tokens === "object" && !Array.isArray(o.tokens) ? (o.tokens as Record<string, unknown>) : {};
  for (const k of TOKEN_KEYS) if (Object.prototype.hasOwnProperty.call(t, k) && isHex(t[k])) tokens[k] = (t[k] as string).toLowerCase();
  const radius = clampRadius(o.radius);
  return radius === undefined ? { mode, tokens } : { mode, tokens, radius };
}

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }

export function loadSettings(storage: StorageLike | undefined): ThemeSettings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_SETTINGS, tokens: {} };
  } catch {
    return { ...DEFAULT_SETTINGS, tokens: {} };
  }
}

export function saveSettings(storage: StorageLike | undefined, s: ThemeSettings): boolean {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(sanitize(s))); return storage !== undefined; } catch { return false; }
}

const EXPORT_TAG = "gitask-theme";

export function exportTheme(s: ThemeSettings): string {
  const c = sanitize(s);
  return JSON.stringify({ format: EXPORT_TAG, version: 1, tokens: c.tokens, ...(c.radius === undefined ? {} : { radius: c.radius }) }, null, 2);
}

export type ImportResult = { ok: true; settings: Pick<ThemeSettings, "tokens" | "radius"> } | { ok: false; error: string };

/** Strict: bad JSON, wrong shape or any invalid value rejects the import. Unknown keys are dropped. */
export function importTheme(text: string): ImportResult {
  if (text.length > 10_000) return { ok: false, error: "File is too large for a theme." };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "Not valid JSON." }; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Expected a JSON object." };
  const o = raw as Record<string, unknown>;
  if (o.format !== EXPORT_TAG) return { ok: false, error: "Not a GITASK theme file." };
  const tokens: ThemeSettings["tokens"] = {};
  if (o.tokens !== undefined) {
    if (!o.tokens || typeof o.tokens !== "object" || Array.isArray(o.tokens)) return { ok: false, error: "tokens must be an object." };
    const t = o.tokens as Record<string, unknown>;
    for (const k of TOKEN_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(t, k)) continue;
      if (!isHex(t[k])) return { ok: false, error: `${k} must be a #rrggbb colour.` };
      tokens[k] = (t[k] as string).toLowerCase();
    }
  }
  let radius: number | undefined;
  if (o.radius !== undefined) {
    if (typeof o.radius !== "number") return { ok: false, error: "radius must be a number." };
    radius = clampRadius(o.radius);
  }
  return { ok: true, settings: radius === undefined ? { tokens } : { tokens, radius } };
}
