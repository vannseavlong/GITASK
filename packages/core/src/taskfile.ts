// Guards for task files. `assertRegularFile` is the one check every write path (and every host handler that acts
// on a path) runs first: a symlink or special file inside Tasks/ must never make GITASK read or write elsewhere.
import { lstat, readFile, realpath } from "node:fs/promises";
import type { Stats } from "node:fs";
import { dirname, relative, isAbsolute } from "node:path";

export const MAX_TASK_BYTES = 512 * 1024;

/**
 * Throws unless `path` is a regular file (lstat: not a symlink, not a directory or device) whose real
 * location is inside `tasksDir` (a symlinked column folder could point outside). With `missingOk`
 * a path that does not exist yet passes (config files that are created on first write).
 * Not atomic with the later write: it stops planted links, not a local attacker racing the process.
 */
export async function assertRegularFile(path: string, tasksDir: string, opts: { missingOk?: boolean } = {}): Promise<Stats | undefined> {
  let st: Stats;
  try {
    st = await lstat(path);
  } catch (e) {
    if (opts.missingOk && (e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
  if (st.isSymbolicLink() || !st.isFile()) throw new Error("not a regular file");
  const rel = relative(await realpath(tasksDir), await realpath(path));
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("outside the Tasks folder");
  return st;
}

/** `assertRegularFile` for a `<Tasks>/<column>/<file>.md` path, deriving the Tasks dir from the path. */
export const assertTaskFile = (path: string): Promise<Stats | undefined> => assertRegularFile(path, dirname(dirname(path)));

/** Host-side check for any message that carries a task `path`: returns the reason, or undefined when fine. */
export async function guardMessagePath(m: { type: string; path?: string }, tasksDir: string): Promise<string | undefined> {
  if (typeof m.path !== "string" || m.type === "deleteTask") return undefined; // deleting a link removes only the link
  try {
    await assertRegularFile(m.path, tasksDir);
    return undefined;
  } catch (e) {
    return `${(e as Error).message}: ${m.path}`;
  }
}

// Reads a task file for the detail panel. The caller has already validated the path with
// `taskPathInside` (inside the Tasks dir, `<column>/<file>.md`); this adds symlink and size guards.
export async function readTaskBody(path: string, tasksDir?: string): Promise<{ text: string } | { error: string }> {
  try {
    const st = tasksDir ? await assertRegularFile(path, tasksDir) : await assertRegularFile(path, dirname(dirname(path)));
    if (st && st.size > MAX_TASK_BYTES) return { error: "file is too large to preview; use Open file" };
    return { text: await readFile(path, "utf8") };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
