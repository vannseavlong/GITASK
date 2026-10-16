// Reads a task file for the detail panel. The caller has already validated the path with
// `taskPathInside` (inside the Tasks dir, `<column>/<file>.md`); this adds symlink and size guards.
import { lstat, readFile } from "node:fs/promises";

export const MAX_TASK_BYTES = 512 * 1024;

export async function readTaskBody(path: string): Promise<{ text: string } | { error: string }> {
  try {
    const st = await lstat(path);
    if (st.isSymbolicLink() || !st.isFile()) return { error: "not a regular file" };
    if (st.size > MAX_TASK_BYTES) return { error: "file is too large to preview; use Open file" };
    return { text: await readFile(path, "utf8") };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
