import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { assertRegularFile } from "./taskfile.ts";

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
    await gitCommitPaths(root, COLOR_MESSAGE.replace("{column}", column), file);
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

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Parse the `github` block. Missing or malformed input yields `undefined` (then no GitHub call is ever made). */
export function parseGithubConfig(text: string): GithubConfig | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const g = isRecord(json) ? json.github : undefined;
  if (!isRecord(g) || typeof g.repo !== "string" || !REPO_RE.test(g.repo.trim())) return undefined;
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
