import { statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Nearest `Tasks/` folder in `from` or any ancestor, or undefined when there is none. */
export function findTasksDir(from: string): string | undefined {
  let cur = resolve(from);
  for (;;) {
    const candidate = join(cur, "Tasks");
    try {
      if (statSync(candidate).isDirectory()) return candidate;
    } catch { /* not here, keep walking */ }
    const up = dirname(cur);
    if (up === cur) return undefined;
    cur = up;
  }
}

export const noTasksMessage = (from: string) =>
  `No Tasks/ folder found in ${resolve(from)} or any parent folder.\n` +
  `Create one here with:  npx gitask-cli init   (or: gitask init)\n` +
  `or point at an existing one with:  --dir <path to Tasks>`;
