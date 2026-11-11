// Read-only sprint model: the `sprint` block of `Tasks/gitask.json` and the sprint files in `Tasks/_sprints/`.
// Nothing here writes; see Docs/architecture/sprints.md for the format.
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BoardSprints, EstimateUnit, Sprint, SprintConfig, SprintState, UnfinishedAction } from "./types.ts";
import { CONFIG_FILE } from "./config.ts";
import { MAX_TASK_BYTES, assertRegularFile } from "./taskfile.ts";
import { cleanText } from "./project-rules.ts";
import { MAX_ESTIMATE, SPRINT_ID_RE, parseDue, parseEstimate, parseHeader } from "./parse.ts";

/** Folder inside `Tasks/` that holds one file per sprint. It starts with `_`, so it is never a column. */
export const SPRINTS_DIR = "_sprints";
export const MAX_SPRINT_LENGTH_DAYS = 60;
export const MAX_SPRINT_NAME = 80;
export const MAX_SPRINT_GOAL = 200;
export const SPRINT_STATES: readonly SprintState[] = ["planned", "active", "closed"];
export const ESTIMATE_UNITS: readonly EstimateUnit[] = ["points", "hours", "none"];
export const UNFINISHED_ACTIONS: readonly UnfinishedAction[] = ["backlog", "next"];
export { SPRINT_ID_RE, MAX_ESTIMATE };

/** Defaults of the `sprint` block; a fresh copy each call so callers may mutate it. */
export const sprintDefaults = (): SprintConfig => ({
  lengthDays: 14,
  estimate: "points",
  doneColumns: ["5-done", "6-deploy"],
  unfinished: "backlog",
  resetStatus: "2-todo",
});

const COLUMN_ID = /^\d+-[^/\\]+$/;
const SPRINT_FILE = /^(S[1-9]\d{0,5})\.md$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/**
 * Parse the `sprint` block of `Tasks/gitask.json`. No block (or not an object) means sprints are off: `undefined`.
 * Each key is checked alone and falls back to its default when bad. With `columns` (the board's column ids),
 * `doneColumns` and `resetStatus` must name existing columns. Never throws.
 */
export function parseSprintConfig(text: string, columns?: readonly string[]): SprintConfig | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  const raw = isRecord(json) ? json.sprint : undefined;
  if (!isRecord(raw)) return undefined;
  const out = sprintDefaults();
  const isColumn = (v: unknown): v is string => typeof v === "string" && COLUMN_ID.test(v) && (!columns || columns.includes(v));

  const len = raw.lengthDays;
  if (typeof len === "number" && Number.isInteger(len) && len >= 1 && len <= MAX_SPRINT_LENGTH_DAYS) out.lengthDays = len;
  if (oneOf(ESTIMATE_UNITS, raw.estimate)) out.estimate = raw.estimate;
  if (Array.isArray(raw.doneColumns)) {
    const done = [...new Set(raw.doneColumns.filter(isColumn))];
    if (done.length) out.doneColumns = done;
  }
  if (oneOf(UNFINISHED_ACTIONS, raw.unfinished)) out.unfinished = raw.unfinished;
  if (raw.resetStatus === null) out.resetStatus = null;
  else if (isColumn(raw.resetStatus)) out.resetStatus = raw.resetStatus;
  return out;
}

/** The `sprint` block of `<dir>/gitask.json`; `undefined` (sprints off) when missing, unreadable, a symlink or malformed. */
export async function readSprintConfig(dir: string, columns?: readonly string[]): Promise<SprintConfig | undefined> {
  try {
    const file = join(dir, CONFIG_FILE);
    await assertRegularFile(file, dir);
    return parseSprintConfig(await readFile(file, "utf8"), columns);
  } catch {
    return undefined;
  }
}

/**
 * Parse one sprint file. The id comes from the file name (`S7.md`); any other name yields `undefined`.
 * Header fields use the task syntax (`- **State:** active`). Each bad value is dropped alone: unknown state means
 * `planned`, an End before Start is dropped. Never throws.
 */
export function parseSprint(path: string, content: string): Sprint | undefined {
  const m = SPRINT_FILE.exec(path.replace(/^.*[\\/]/, ""));
  if (!m) return undefined;
  const id = m[1];
  const number = Number(id.slice(1));
  const { title, fields } = parseHeader(content);
  const state = fields["state"]?.trim().toLowerCase();
  const start = parseDue(fields["start"]);
  const end = parseDue(fields["end"]);
  const goal = cleanText(fields["goal"], MAX_SPRINT_GOAL, "goal", false);
  const capacity = parseEstimate(fields["capacity"]);
  return {
    id,
    number,
    name: cleanText(title, MAX_SPRINT_NAME, "name", false) ?? `Sprint ${number}`,
    state: oneOf(SPRINT_STATES, state) ? state : "planned",
    ...(start ? { start } : {}),
    ...(end && !(start && end < start) ? { end } : {}),
    ...(goal ? { goal } : {}),
    ...(capacity !== undefined ? { capacity } : {}),
    path,
  };
}

/**
 * Every sprint file in `<dir>/_sprints/`, sorted by number. A missing folder yields `[]`. The folder must be a real
 * directory and each file a regular file inside `Tasks/` (the task symlink guard) of at most `MAX_TASK_BYTES`;
 * anything else is skipped. Never throws.
 */
export async function readSprints(dir: string): Promise<Sprint[]> {
  const folder = join(dir, SPRINTS_DIR);
  try {
    if (!(await lstat(folder)).isDirectory()) return [];
    const names = (await readdir(folder, { withFileTypes: true })).filter((e) => e.isFile() && SPRINT_FILE.test(e.name)).map((e) => e.name);
    const list = await Promise.all(
      names.map(async (name) => {
        const path = join(folder, name);
        try {
          const st = await assertRegularFile(path, dir);
          if (!st || st.size > MAX_TASK_BYTES) return undefined;
          return parseSprint(path, await readFile(path, "utf8"));
        } catch {
          return undefined;
        }
      }),
    );
    return list.filter((s): s is Sprint => !!s).sort((a, b) => a.number - b.number);
  } catch {
    return [];
  }
}

/** The active sprint id: with several marked active, the lowest number wins and a warning names the others. */
export function pickActiveSprint(list: readonly Sprint[]): { active?: string; warnings: string[] } {
  const active = [...list].filter((s) => s.state === "active").sort((a, b) => a.number - b.number);
  if (active.length <= 1) return { active: active[0]?.id, warnings: [] };
  const rest = active.slice(1).map((s) => s.id).join(", ");
  return { active: active[0].id, warnings: [`More than one sprint is active; using ${active[0].id}, ignoring ${rest}`] };
}

/** Next free sprint id: highest number + 1 (`S1` when there is none). */
export function nextSprintId(list: readonly Sprint[]): string {
  return `S${list.reduce((max, s) => Math.max(max, s.number), 0) + 1}`;
}

/** Sprint data for `loadBoard`: `undefined` when sprints are off, otherwise config, sprints, active id and warnings. */
export async function loadSprints(dir: string, columns?: readonly string[]): Promise<BoardSprints | undefined> {
  const config = await readSprintConfig(dir, columns);
  if (!config) return undefined;
  const list = await readSprints(dir);
  const { active, warnings } = pickActiveSprint(list);
  return { config, list, ...(active ? { active } : {}), ...(warnings.length ? { warnings } : {}) };
}
