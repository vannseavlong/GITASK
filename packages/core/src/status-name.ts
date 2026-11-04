// Pure (no node imports): `protocol.ts` is bundled into the webview, so the name rules live here.

/** Longest status name, in characters (the folder is `<number>-<slug>`). */
export const MAX_STATUS_NAME = 40;

/** Names Windows refuses as a file name (with any extension), plus names that would confuse the board. */
const RESERVED = new Set(["con", "prn", "aux", "nul", "gitkeep", "gitask", ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`)]);

export type StatusNameResult = { ok: true; slug: string } | { ok: false; error: string };

/**
 * The one check of a new status name, shared by the VS Code extension and `gitask serve` (and run again inside
 * `addColumn`). Allowed: ASCII letters, digits, spaces and hyphens. The result is a lower-case slug that becomes the
 * folder name, so nothing that could escape `Tasks/` or hide a folder (`..`, separators, leading `_` or `.`) gets through.
 * `existing` is the ids or labels of the current statuses; a clash is checked case-insensitively on the slug.
 */
export function validateStatusName(name: unknown, existing: readonly string[] = []): StatusNameResult {
  if (typeof name !== "string") return { ok: false, error: "Enter a name for the status." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a name for the status." };
  if (trimmed.length > MAX_STATUS_NAME) return { ok: false, error: `Use at most ${MAX_STATUS_NAME} characters.` };
  if (/^[_.]/.test(trimmed)) return { ok: false, error: "A name cannot start with _ or . (those folders are hidden from the board)." };
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(trimmed)) return { ok: false, error: "Use only letters (A-Z), digits, spaces and hyphens." };
  const slug = trimmed.toLowerCase().replace(/[ -]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return { ok: false, error: "Use at least one letter or digit." };
  if (RESERVED.has(slug)) return { ok: false, error: `"${trimmed}" is a reserved name. Pick another.` };
  const taken = new Set(existing.map((e) => e.replace(/^\d+-/, "").toLowerCase().replace(/[ _-]+/g, "-")));
  if (taken.has(slug)) return { ok: false, error: `A status named "${slug}" already exists (names are compared ignoring case).` };
  return { ok: true, slug };
}
