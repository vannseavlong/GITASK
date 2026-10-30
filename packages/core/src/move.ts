import { localDate } from "./date.ts";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { columnLabel } from "./board.ts";
import { gitAdd, gitCommitPaths, gitMv, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";

export interface MoveOptions {
  /** Commit the move (default true). Ignored when the task is not in a git repo. */
  commit?: boolean;
  /** Commit message template; `{id}`, `{from}`, `{to}` are replaced. */
  message?: string;
  /** Date written to `Started / updated`; defaults to today. */
  today?: string;
}

export interface MoveResult {
  from: string;
  to: string;
  committed: boolean;
}


/** Rewrite the second date of `Started / updated: a / b` to `date`. Leaves other formats alone. */
export function bumpUpdated(content: string, date: string): string {
  return content.replace(
    /^(\s*[-*]\s+\*\*Started \/ updated:\*\*\s*)(.*?)\s*\/\s*[^/\n]*$/m,
    (_m, head: string, started: string) => `${head}${started} / ${date}`,
  );
}

export const DEFAULT_MESSAGE = "task({id}): {from} → {to}";

export async function moveTask(
  tasksDir: string,
  taskPath: string,
  toColumn: string,
  opts: MoveOptions = {},
): Promise<MoveResult> {
  const fromColumn = basename(join(taskPath, ".."));
  const from = taskPath;
  const to = join(tasksDir, toColumn, basename(taskPath));
  if (fromColumn === toColumn) return { from, to, committed: false };

  const id = basename(taskPath, ".md");
  const cwd = join(taskPath, "..");
  const root = await repoRoot(cwd);
  const useGit = !!root && (await isTracked(cwd, from));

  await mkdir(join(tasksDir, toColumn), { recursive: true });
  if (useGit) await gitMv(root!, from, to);
  else await rename(from, to);

  const updated = bumpUpdated(await readFile(to, "utf8"), opts.today ?? localDate());
  await writeFile(to, updated);

  let committed = false;
  if (useGit && opts.commit !== false) {
    await gitAdd(root!, to);
    const msg = fillTemplate(opts.message ?? DEFAULT_MESSAGE, { id, from: columnLabel(fromColumn), to: columnLabel(toColumn) });
    await gitCommitPaths(root!, msg, from, to);
    committed = true;
  }
  return { from, to, committed };
}
