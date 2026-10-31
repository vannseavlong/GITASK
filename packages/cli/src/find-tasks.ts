import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Nearest ancestor of `from` (or `from` itself) that holds a `.git`, or undefined outside a repo. */
function projectRoot(from: string): string | undefined {
  let cur = from;
  for (;;) {
    if (existsSync(join(cur, ".git"))) return cur;
    const up = dirname(cur);
    if (up === cur) return undefined;
    cur = up;
  }
}

/** `Tasks` directly inside `parent`, matched case-exactly (macOS would also match `tasks`) and never through a symlink. */
function tasksIn(parent: string): string | undefined {
  try {
    const hit = readdirSync(parent, { withFileTypes: true }).find((d) => d.name === "Tasks" && d.isDirectory());
    return hit ? join(parent, hit.name) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The project's `Tasks/` folder: in `from` or an ancestor, but never above the git root. Outside a git repo
 * only `from` itself is checked, so `gitask serve` can never pick up (and write to) an unrelated folder.
 */
export function findTasksDir(from: string): string | undefined {
  const start = resolve(from);
  const root = projectRoot(start) ?? start;
  let cur = start;
  for (;;) {
    const hit = tasksIn(cur);
    if (hit) return hit;
    if (cur === root) return undefined;
    const up = dirname(cur);
    if (up === cur) return undefined;
    cur = up;
  }
}

export const noTasksMessage = (from: string) =>
  `No Tasks/ folder found in ${resolve(from)} or its project folders (up to the git root).\n` +
  `Create one here with:  npx gitask-cli init   (or: gitask init)\n` +
  `or point at an existing one with:  --dir <path to Tasks>`;
