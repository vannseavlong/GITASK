import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";

export const CONFIG_FILE = "gitask.json";
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const COLOR_MESSAGE = "board: set colour of {column}";

export const isColor = (v: unknown): v is string => typeof v === "string" && COLOR_RE.test(v);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Parse the text of `Tasks/gitask.json` into `{ column folder: colour }`. Bad input yields no colours, never throws. */
export function parseColors(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return out;
  }
  const columns = isRecord(json) ? json.columns : undefined;
  if (!isRecord(columns)) return out;
  for (const [id, v] of Object.entries(columns)) {
    if (isRecord(v) && isColor(v.color)) out[id] = v.color.toLowerCase();
  }
  return out;
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
  const columns: Record<string, unknown> = isRecord(json.columns) ? { ...json.columns } : {};
  const entry: Record<string, unknown> = isRecord(columns[column]) ? { ...(columns[column] as Record<string, unknown>) } : {};
  if (color === null) delete entry.color;
  else entry.color = color.toLowerCase();
  if (Object.keys(entry).length) columns[column] = entry;
  else delete columns[column];
  json.columns = columns;
  await writeFile(file, JSON.stringify(json, null, 2) + "\n");

  const root = await repoRoot(dir);
  if (root && opts.commit !== false && (await isTracked(dir, file))) {
    await gitAdd(root, file);
    await gitCommitPaths(root, COLOR_MESSAGE.replace("{column}", column), file);
    return { committed: true };
  }
  return { committed: false };
}
