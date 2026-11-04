import { lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep, isAbsolute } from "node:path";
import { columnLabel } from "./board.ts";
import { isColor, setColumnColor } from "./config.ts";
import { gitAdd, gitCommitPaths, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { validateStatusName } from "./status-name.ts";

export { validateStatusName, MAX_STATUS_NAME } from "./status-name.ts";
export type { StatusNameResult } from "./status-name.ts";

export const ADD_COLUMN_MESSAGE = "status({id}): add";
/** Highest folder number; keeps the prefix short and the sort sane. */
export const MAX_STATUS_NUMBER = 999;
const COLUMN_DIR = /^(\d+)-(.+)$/;

/**
 * Pick the folder number for a new status. Default: one past the highest existing number. With `after` (an existing
 * column id): the number right after it, only when that number is free, so no existing folder is ever renamed.
 */
export function chooseStatusNumber(existing: readonly string[], after?: string): number {
  const nums = existing.map((id) => COLUMN_DIR.exec(id)).filter((m): m is RegExpExecArray => m !== null).map((m) => parseInt(m[1], 10));
  if (after === undefined) {
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    if (n > MAX_STATUS_NUMBER) throw new Error("Too many statuses.");
    return n;
  }
  const m = COLUMN_DIR.exec(after);
  if (!existing.includes(after) || !m) throw new Error(`Unknown status: ${after}`);
  const n = parseInt(m[1], 10) + 1;
  if (nums.includes(n) || n > MAX_STATUS_NUMBER) {
    throw new Error(`There is no free number after "${columnLabel(after)}". Add the status at the end, or rename the folders to leave a gap.`);
  }
  return n;
}

export interface AddColumnOptions {
  /** Commit the new folder's `.gitkeep` (default true; only inside a repo). */
  commit?: boolean;
  /** Existing column id to insert after (needs a free number); default: append at the end. */
  after?: string;
  /** Optional `#rrggbb`, saved through `setColumnColor`. */
  color?: string;
}

export interface AddColumnResult {
  /** The new folder name, for example `7-review`. */
  id: string;
  path: string;
  committed: boolean;
}

/**
 * Create a status folder `<n>-<slug>/` with a `.gitkeep` (a repo does not track empty folders, same as `initTasks`)
 * and commit that one path. Never touches existing folders, never stages anything else.
 */
export async function addColumn(tasksDir: string, name: string, opts: AddColumnOptions = {}): Promise<AddColumnResult> {
  if (opts.color !== undefined && !isColor(opts.color)) throw new Error(`Not a #rrggbb colour: ${opts.color}`);
  const existing = (await readdir(tasksDir, { withFileTypes: true })).filter((e) => e.isDirectory() && COLUMN_DIR.test(e.name)).map((e) => e.name);
  const v = validateStatusName(name, existing);
  if (!v.ok) throw new Error(v.error);
  const id = `${chooseStatusNumber(existing, opts.after)}-${v.slug}`;

  // Belt and braces: the folder must be a direct child of Tasks/.
  const root = resolve(tasksDir);
  const dir = resolve(root, id);
  const rel = relative(root, dir);
  if (rel !== id || rel.startsWith("..") || isAbsolute(rel) || rel.includes(sep)) throw new Error("Invalid status name.");
  if (await lstat(dir).then(() => true, () => false)) throw new Error(`"${id}" already exists.`);

  await mkdir(dir); // not recursive: fails rather than create parents or reuse a folder
  const keep = join(dir, ".gitkeep");
  await writeFile(keep, "", { flag: "wx" });

  let committed = false;
  const repo = await repoRoot(dir);
  if (repo && opts.commit !== false) {
    try {
      await gitAdd(repo, keep);
      await gitCommitPaths(repo, fillTemplate(ADD_COLUMN_MESSAGE, { id }), keep);
      committed = true;
    } catch {
      // e.g. Tasks/ is ignored: the folder exists, it is just not committed.
    }
  }
  if (opts.color) await setColumnColor(tasksDir, id, opts.color, { commit: opts.commit });
  return { id, path: dir, committed };
}
