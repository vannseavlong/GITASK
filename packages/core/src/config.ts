import { constants } from "node:fs";
import { open, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Project, ProjectLayout, ProjectLogo } from "./types.ts";
import { gitAdd, gitCommitPaths, gitRm, hasLocalChanges, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { assertRegularFile } from "./taskfile.ts";
import { LOGO_TYPES, MAX_LOGO_BYTES, MAX_SUBTITLE, MAX_TITLE, PROJECT_ENUMS as ENUMS, PROJECT_LAYOUT_DEFAULTS, UNSAFE_TEXT, cleanText } from "./project-rules.ts";
export { LOGO_TYPES, MAX_LOGO_BYTES, PROJECT_LAYOUT_DEFAULTS };

const MAX_LOGO_PATH = 255;

export const CONFIG_FILE = "gitask.json";
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const COLOR_MESSAGE = "board: set colour of {column}";

export const isColor = (v: unknown): v is string => typeof v === "string" && COLOR_RE.test(v);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Own-property lookup: a folder named `constructor` or `toString` never yields an inherited value. */
export function colorOf(colors: Record<string, string>, id: string): string | undefined {
  if (!Object.hasOwn(colors, id)) return undefined;
  const v = colors[id];
  return isColor(v) ? v : undefined;
}

/** Parse the text of `Tasks/gitask.json` into `{ column folder: colour }`. Bad input yields no colours, never throws. */
export function parseColors(text: string): Record<string, string> {
  const out = new Map<string, string>();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {};
  }
  const columns = isRecord(json) ? json.columns : undefined;
  if (!isRecord(columns)) return {};
  for (const [id, v] of Object.entries(columns)) {
    if (isRecord(v) && isColor(v.color)) out.set(id, v.color.toLowerCase());
  }
  // fromEntries defines own properties, so a folder named `__proto__` stays plain data. Read with colorOf().
  return Object.fromEntries(out);
}

/** Column colours from `<dir>/gitask.json`; `{}` when the file is missing or malformed. */
export async function readColors(dir: string): Promise<Record<string, string>> {
  try {
    return parseColors(await readFile(join(dir, CONFIG_FILE), "utf8"));
  } catch {
    return {};
  }
}

export interface ColorOptions {
  /** Commit the file when it is tracked by git (default true). */
  commit?: boolean;
}

/**
 * Set (`color` = "#rrggbb") or clear (`null`) the colour of one column in `<dir>/gitask.json`.
 * Keeps every other key. Commits that file only, and only when it is already tracked.
 */
export async function setColumnColor(dir: string, column: string, color: string | null, opts: ColorOptions = {}): Promise<{ committed: boolean }> {
  if (color !== null && !isColor(color)) throw new Error(`Not a #rrggbb colour: ${color}`);
  const file = join(dir, CONFIG_FILE);
  let json: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (isRecord(parsed)) json = parsed;
    else throw new Error(`${CONFIG_FILE} is not a JSON object`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Cannot update ${CONFIG_FILE}: ${(e as Error).message}`);
  }
  const columns = new Map<string, unknown>(isRecord(json.columns) ? Object.entries(json.columns) : []);
  const prev = columns.get(column);
  const entry: Record<string, unknown> = isRecord(prev) ? { ...prev } : {};
  if (color === null) delete entry.color;
  else entry.color = color.toLowerCase();
  if (Object.keys(entry).length) columns.set(column, entry);
  else columns.delete(column);
  json.columns = Object.fromEntries(columns);
  await assertRegularFile(file, dir, { missingOk: true });
  await writeFile(file, JSON.stringify(json, null, 2) + "\n");

  const root = await repoRoot(dir);
  if (root && opts.commit !== false && (await isTracked(dir, file))) {
    await gitAdd(root, file);
    await gitCommitPaths(root, fillTemplate(COLOR_MESSAGE, { column }), file);
    return { committed: true };
  }
  return { committed: false };
}

/** Opt-in GitHub link: `github: { repo: "owner/name", project?: number }` in `Tasks/gitask.json`. */
export interface GithubConfig {
  repo: string;
  /** Projects v2 number (the number in the project URL). */
  project?: number;
}

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME_RE = /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;

/** `owner/name` as GitHub allows it: no `.`/`..` segments (a URL would normalise them away), no `.git` suffix. */
export function isRepoSlug(v: string): boolean {
  const [owner, name, ...rest] = v.split("/");
  return !rest.length && name !== undefined && OWNER_RE.test(owner) && NAME_RE.test(name) && !/\.git$/i.test(name);
}

/** Parse the `github` block. Missing or malformed input yields `undefined` (then no GitHub call is ever made). */
export function parseGithubConfig(text: string): GithubConfig | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const g = isRecord(json) ? json.github : undefined;
  if (!isRecord(g) || typeof g.repo !== "string" || !isRepoSlug(g.repo.trim())) return undefined;
  const out: GithubConfig = { repo: g.repo.trim() };
  if (typeof g.project === "number" && Number.isInteger(g.project) && g.project > 0) out.project = g.project;
  return out;
}

/** The `github` block of `<dir>/gitask.json`; `undefined` when absent or malformed. */
export async function readGithubConfig(dir: string): Promise<GithubConfig | undefined> {
  try {
    return parseGithubConfig(await readFile(join(dir, CONFIG_FILE), "utf8"));
  } catch {
    return undefined;
  }
}

// ---- Project identity: `project` block of Tasks/gitask.json ---------------------------------------------------

/**
 * Syntax check of a logo path from config: relative to the Tasks dir, `/` separated, no `.`/`..`/empty segments,
 * no drive letter, backslash, control character, and an allow-listed image extension.
 * This does not touch the disk; `resolveLogo` does.
 */
export function isLogoPath(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > MAX_LOGO_PATH) return false;
  if (v.startsWith("/") || v.includes("\\") || v.includes(":") || UNSAFE_TEXT.test(v)) return false;
  const parts = v.split("/");
  if (parts.some((p) => !p || p === "." || p === "..")) return false;
  const last = parts[parts.length - 1];
  const dot = last.lastIndexOf(".");
  return dot > 0 && Object.hasOwn(LOGO_TYPES, last.slice(dot + 1).toLowerCase());
}

/**
 * Check a logo on disk and return its path and mime type; throws with the reason otherwise. The file must be
 * a regular file (no symlink, also not through a symlinked folder) whose real location is inside `dir`,
 * non-empty and at most `MAX_LOGO_BYTES`. Bytes are never read.
 */
export async function resolveLogo(dir: string, logo: string): Promise<ProjectLogo> {
  if (!isLogoPath(logo)) throw new Error("logo must be a relative path to a png, jpg, webp, gif or svg file inside Tasks/");
  const file = resolve(dir, ...logo.split("/"));
  const rel = relative(resolve(dir), file);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("logo is outside the Tasks folder");
  let st;
  try {
    st = await assertRegularFile(file, dir);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new Error(code === "ENOENT" ? "logo file not found" : `logo rejected: ${(e as Error).message}`);
  }
  if (!st || st.size === 0) throw new Error("logo file is empty");
  if (st.size > MAX_LOGO_BYTES) throw new Error(`logo is larger than ${MAX_LOGO_BYTES / 1024} KiB`);
  return { path: logo, mime: LOGO_TYPES[logo.slice(logo.lastIndexOf(".") + 1).toLowerCase()], version: `${Math.trunc(st.mtimeMs)}-${st.size}` };
}

/**
 * The bytes of the configured logo, for a host to serve. Reads the project config and runs `resolveLogo` NOW (regular
 * file, extension, size, inside `dir`), so a file swapped after the board loaded is not followed. Nothing is taken
 * from the caller: there is no path argument. Returns `undefined` when no logo is configured and throws when the
 * configured one is not valid. The read stops one byte past the cap, so a file that grew in between is refused.
 */
export async function readLogoBytes(dir: string): Promise<{ bytes: Buffer; mime: string } | undefined> {
  const logo = (await readProject(dir))?.logo;
  if (!logo) return undefined;
  const checked = await resolveLogo(dir, logo.path);
  // O_NOFOLLOW: a symlink put in place after `resolveLogo` is refused by the open itself (no-op flag on Windows).
  const fh = await open(resolve(dir, ...checked.path.split("/")), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    const st = await fh.stat();
    if (!st.isFile() || st.size === 0 || st.size > MAX_LOGO_BYTES) return undefined;
    if (!(await openedUnder(dir, resolve(dir, ...checked.path.split("/")), st))) return undefined;
    const buf = Buffer.alloc(MAX_LOGO_BYTES + 1);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    if (bytesRead === 0 || bytesRead > MAX_LOGO_BYTES) return undefined;
    const bytes = buf.subarray(0, bytesRead);
    return { bytes, mime: checked.mime };
  } finally {
    await fh.close();
  }
}

/**
 * After the open: is the file we hold really the one at `file`, and does that path really live under the real `dir`?
 * O_NOFOLLOW only covers the last path segment; a parent folder swapped for a symlink between `resolveLogo` and the open
 * is caught here, because the real path then leaves `dir` or points at a different file (device and inode differ).
 */
export async function openedUnder(dir: string, file: string, opened: { dev: number; ino: number }): Promise<boolean> {
  try {
    const realDir = await realpath(dir);
    const real = await realpath(file);
    const rel = relative(realDir, real);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) return false;
    const now = await stat(real);
    return now.dev === opened.dev && now.ino === opened.ino;
  } catch {
    return false;
  }
}

/** `data:` URL for a logo's bytes, for a host that cannot give the page a URL (the VS Code webview). */
export function logoDataUrl(logo: { bytes: Uint8Array; mime: string }): string {
  return `data:${logo.mime};base64,${Buffer.from(logo.bytes).toString("base64")}`;
}

function parseLayout(v: unknown): ProjectLayout {
  const out: ProjectLayout = { ...PROJECT_LAYOUT_DEFAULTS };
  if (!isRecord(v)) return out;
  for (const k of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
    const x = v[k];
    if (typeof x === "string" && (ENUMS[k] as readonly string[]).includes(x)) (out as unknown as Record<string, string>)[k] = x;
  }
  if (typeof v.showTitle === "boolean") out.showTitle = v.showTitle;
  return out;
}

/** What `parseProject` can know without the disk: the logo is only a syntactically valid path. */
export interface ParsedProject {
  title?: string;
  subtitle?: string;
  logo?: string;
  layout: ProjectLayout;
}

/** Parse the `project` block. Anything wrong falls back to a default or is dropped; never throws. */
export function parseProject(text: string): ParsedProject {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { layout: { ...PROJECT_LAYOUT_DEFAULTS } };
  }
  const p = isRecord(json) ? json.project : undefined;
  if (!isRecord(p)) return { layout: { ...PROJECT_LAYOUT_DEFAULTS } };
  const out: ParsedProject = { layout: parseLayout(p.layout) };
  const title = cleanText(p.title, MAX_TITLE, "title", false);
  const subtitle = cleanText(p.subtitle, MAX_SUBTITLE, "subtitle", false);
  if (title) out.title = title;
  if (subtitle) out.subtitle = subtitle;
  if (isLogoPath(p.logo)) out.logo = p.logo;
  return out;
}

/**
 * The validated project of `<dir>/gitask.json`; `undefined` when the file is missing, unreadable or not a regular
 * file, or when no title, subtitle or logo is set. A logo that fails `resolveLogo` is dropped, the rest is kept.
 */
export async function readProject(dir: string): Promise<Project | undefined> {
  let parsed: ParsedProject;
  try {
    const file = join(dir, CONFIG_FILE);
    await assertRegularFile(file, dir);
    parsed = parseProject(await readFile(file, "utf8"));
  } catch {
    return undefined;
  }
  const { logo: logoPath, ...rest } = parsed;
  const project: Project = rest;
  if (logoPath) {
    try {
      project.logo = await resolveLogo(dir, logoPath);
    } catch {
      /* broken or hostile logo: show the project without it */
    }
  }
  return project.title || project.subtitle || project.logo ? project : undefined;
}

/** Fields `setProject` changes: `undefined` leaves a field alone, `null` clears it. */
export interface ProjectInput {
  title?: string | null;
  subtitle?: string | null;
  logo?: string | null;
  layout?: Partial<ProjectLayout>;
}

export interface ProjectOptions {
  /** Commit the file when it is tracked by git (default true). */
  commit?: boolean;
  /** Absolute path of one more file to commit with the config (a logo this call chose). Its path is re-checked by `resolveLogo`, never taken from a caller. */
  withFile?: string;
  /**
   * Absolute path of an orphaned generated logo to delete in the same commit (`git rm` plus `gitask.json`, by pathspec).
   * The caller (`saveProject`) has already checked its name, content hash and that nothing references it. Only acted on
   * when the commit runs (config tracked, `commit` not false) and the file is tracked; otherwise the file is left alone.
   */
  removeFile?: string;
}

export const PROJECT_MESSAGE = "board: update project settings";

/**
 * Update the `project` block of `<dir>/gitask.json`. Validates everything first (throws, writes nothing),
 * keeps every other key, and commits that file only, and only when it is already tracked.
 * A logo must pass `resolveLogo`; the logo file itself is committed only through `opts.withFile`, and removed only through `opts.removeFile`.
 */
export async function setProject(dir: string, input: ProjectInput, opts: ProjectOptions = {}): Promise<{ committed: boolean }> {
  if (!isRecord(input)) throw new Error("project settings must be an object");
  for (const k of Object.keys(input)) if (!["title", "subtitle", "logo", "layout"].includes(k)) throw new Error(`Unknown project field: ${k}`);

  const patch = new Map<string, unknown>(); // field -> value, or undefined to delete
  for (const [k, max] of [["title", MAX_TITLE], ["subtitle", MAX_SUBTITLE]] as const) {
    const v = input[k];
    if (v !== undefined) patch.set(k, v === null ? undefined : cleanText(v, max, k, true));
  }
  const logo: unknown = input.logo;
  if (logo !== undefined) patch.set("logo", logo === null ? undefined : (await resolveLogo(dir, logo as string)).path);

  const layoutPatch = new Map<string, unknown>();
  if (input.layout !== undefined) {
    if (!isRecord(input.layout)) throw new Error("layout must be an object");
    for (const [k, v] of Object.entries(input.layout)) {
      if (v === undefined) continue;
      if (k === "showTitle") {
        if (typeof v !== "boolean") throw new Error("layout.showTitle must be true or false");
      } else if (Object.hasOwn(ENUMS, k)) {
        const allowed = ENUMS[k as keyof typeof ENUMS] as readonly string[];
        if (typeof v !== "string" || !allowed.includes(v)) throw new Error(`layout.${k} must be one of ${allowed.join(", ")}`);
      } else throw new Error(`Unknown layout field: ${k}`);
      layoutPatch.set(k, v);
    }
  }

  const file = join(dir, CONFIG_FILE);
  await assertRegularFile(file, dir, { missingOk: true }); // before the read: a symlinked config is never parsed
  let json: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (isRecord(parsed)) json = parsed;
    else throw new Error(`${CONFIG_FILE} is not a JSON object`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw new Error(`Cannot update ${CONFIG_FILE}: ${(e as Error).message}`);
  }
  const prev = json.project;
  const entry = new Map<string, unknown>(isRecord(prev) ? Object.entries(prev) : []);
  for (const [k, v] of patch) {
    if (v === undefined) entry.delete(k);
    else entry.set(k, v);
  }
  if (layoutPatch.size) {
    const old = entry.get("layout");
    const layout = new Map<string, unknown>(isRecord(old) ? Object.entries(old) : []);
    for (const [k, v] of layoutPatch) layout.set(k, v);
    entry.set("layout", Object.fromEntries(layout));
  }
  if (entry.size) json.project = Object.fromEntries(entry);
  else delete json.project;
  await assertRegularFile(file, dir, { missingOk: true });
  await writeFile(file, JSON.stringify(json, null, 2) + "\n");

  const root = await repoRoot(dir);
  if (root && opts.commit !== false && (await isTracked(dir, file))) {
    const files = opts.withFile ? [file, opts.withFile] : [file];
    let dirty = false;
    for (const f of files) dirty ||= await hasLocalChanges(root, f);
    const drop = opts.removeFile && (await isTracked(dir, opts.removeFile)) ? opts.removeFile : undefined;
    if (!dirty && !drop) return { committed: false }; // same content again: nothing to commit
    await gitAdd(root, ...files);
    if (drop) {
      await gitRm(root, drop);
      files.push(drop);
    }
    await gitCommitPaths(root, PROJECT_MESSAGE, ...files);
    return { committed: true };
  }
  return { committed: false };
}
