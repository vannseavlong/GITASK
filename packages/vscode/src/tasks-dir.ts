// Resolves the `gitask.tasksDir` setting against the workspace root. A workspace's own `.vscode/settings.json` can set
// it, so a cloned repo must not be able to point the extension at a folder outside the workspace.
import { isAbsolute, relative, resolve } from "node:path";

export type TasksDirResult = { ok: true; dir: string } | { ok: false; error: string };

export function resolveTasksDir(root: string, setting: string): TasksDirResult {
  const dir = resolve(root, setting);
  const rel = relative(resolve(root), dir);
  if (rel === ".." || rel.startsWith(`..${"/"}`) || rel.startsWith("..\\") || isAbsolute(rel)) {
    return { ok: false, error: `The setting gitask.tasksDir ("${setting}") points outside the workspace, so GITASK ignores it. Use a folder inside the workspace.` };
  }
  return { ok: true, dir };
}
