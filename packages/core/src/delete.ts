import { readdir, rm, rmdir, unlink } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { gitCommitPaths, gitRm, hasLocalChanges, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";

export interface DeleteOptions {
  /** Commit the removal (default true). Without it a tracked file is just unlinked. */
  commit?: boolean;
  /** Commit message; `{id}` is replaced. */
  message?: string;
}

export interface DeleteResult {
  path: string;
  committed: boolean;
}

export const DELETE_TASK_MESSAGE = "task({id}): delete";
export const DELETE_COLUMN_MESSAGE = "status({id}): delete";

const COLUMN = /^\d+-[^\\/]+$/;

export type DeleteImpact = "recoverable" | "permanent" | "loses-local-edits";

/**
 * What deleting this task would cost, for the confirm dialog. `recoverable`: tracked, clean and
 * committed on delete. `loses-local-edits`: tracked with uncommitted changes. `permanent`: untracked,
 * not in a repo, or commit off.
 */
export async function deleteImpact(taskPath: string, opts: { commit?: boolean } = {}): Promise<DeleteImpact> {
  const cwd = dirname(taskPath);
  const root = await repoRoot(cwd);
  if (!root || opts.commit === false || !(await isTracked(cwd, taskPath))) return "permanent";
  return (await hasLocalChanges(cwd, taskPath)) ? "loses-local-edits" : "recoverable";
}

/**
 * Delete one task file. Tracked file in a repo with `commit` on: `git rm` plus a commit of that
 * path only (recoverable from history). Anything else: a plain unlink.
 */
export async function deleteTask(tasksDir: string, taskPath: string, opts: DeleteOptions = {}): Promise<DeleteResult> {
  const parts = relative(resolve(tasksDir), resolve(taskPath)).split(sep);
  if (parts.length !== 2 || parts.includes("..") || !COLUMN.test(parts[0]) || !parts[1].endsWith(".md")) {
    throw new Error(`Not a task file inside ${tasksDir}: ${taskPath}`);
  }
  const cwd = dirname(taskPath);
  const root = await repoRoot(cwd);
  if (root && opts.commit !== false && (await isTracked(cwd, taskPath))) {
    await gitRm(root, taskPath);
    const id = basename(taskPath, ".md");
    await gitCommitPaths(root, fillTemplate(opts.message ?? DELETE_TASK_MESSAGE, { id }), taskPath);
    return { path: taskPath, committed: true };
  }
  await unlink(taskPath);
  return { path: taskPath, committed: false };
}

/**
 * Delete a status folder. Refused when it holds any task (or any file other than `.gitkeep`):
 * deleting a status never deletes work.
 */
export async function deleteColumn(tasksDir: string, column: string, opts: DeleteOptions = {}): Promise<DeleteResult> {
  if (!COLUMN.test(column) || column === "." || column === "..") throw new Error(`Not a status folder: ${column}`);
  const dir = join(tasksDir, column);
  const entries = await readdir(dir);
  const tasks = entries.filter((f) => f.endsWith(".md")).length;
  if (tasks) throw new Error(`Cannot delete "${column}": it still has ${tasks} task${tasks === 1 ? "" : "s"}. Move or delete them first.`);
  const JUNK = new Set([".gitkeep", ".DS_Store", "Thumbs.db"]);
  const other = entries.filter((f) => !JUNK.has(f));
  if (other.length) throw new Error(`Cannot delete "${column}": it contains ${other.join(", ")}.`);

  let committed = false;
  const root = await repoRoot(dir);
  const keep = join(dir, ".gitkeep");
  if (entries.includes(".gitkeep")) {
    if (root && opts.commit !== false && (await isTracked(dir, keep))) {
      await gitRm(root, keep);
      await gitCommitPaths(root, fillTemplate(opts.message ?? DELETE_COLUMN_MESSAGE, { id: column }), keep);
      committed = true;
    } else await unlink(keep);
  }
  for (const j of [".DS_Store", "Thumbs.db"]) if (entries.includes(j)) await unlink(join(dir, j));
  await rm(dir, { recursive: false, force: true }).catch(() => rmdir(dir)); // git rm may already have removed it
  return { path: dir, committed };
}
