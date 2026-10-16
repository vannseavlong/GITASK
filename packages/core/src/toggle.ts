import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { gitAdd, gitCommitPaths, isTracked, repoRoot } from "./git.ts";
import { parseSubtasks } from "./parse.ts";
import type { Subtask, Task } from "./types.ts";

export interface ToggleOptions {
  /** Commit the change (default true). Ignored when the file is not tracked by git. */
  commit?: boolean;
  /** Commit message template; `{id}`, `{text}`, `{state}` (`checked`/`unchecked`) are replaced. */
  message?: string;
}

export interface ToggleResult {
  path: string;
  checked: boolean;
  committed: boolean;
}

export const TOGGLE_MESSAGE = "task({id}): {state} {text}";

/**
 * Flip one checkbox of `task` (an entry of `task.subtasks`). Changes exactly that one character,
 * so line endings and every other byte stay as they were, and commits that file only.
 * Refuses when the file no longer has the same checkbox on the same line as when it was read.
 */
export async function toggleSubtask(task: Task, index: number, opts: ToggleOptions = {}): Promise<ToggleResult> {
  const sub: Subtask | undefined = task.subtasks[index];
  if (!sub) throw new Error(`No sub-task ${index} in ${task.id}`);

  const raw = await readFile(task.path, "utf8");
  const now = parseSubtasks(raw).find((s) => s.line === sub.line && s.col === sub.col);
  if (!now || now.text !== sub.text || now.checked !== sub.checked) {
    throw new Error(`${task.id} changed since it was read; reload and try again`);
  }

  let start = 0;
  for (let n = 1; n < sub.line; n++) start = raw.indexOf("\n", start) + 1;
  const at = start + sub.col;
  const checked = !sub.checked;
  await writeFile(task.path, raw.slice(0, at) + (checked ? "x" : " ") + raw.slice(at + 1));

  let committed = false;
  const cwd = dirname(task.path);
  const root = await repoRoot(cwd);
  if (root && opts.commit !== false && (await isTracked(cwd, task.path))) {
    const msg = (opts.message ?? TOGGLE_MESSAGE)
      .replaceAll("{id}", basename(task.path, ".md"))
      .replaceAll("{state}", checked ? "checked" : "unchecked")
      .replaceAll("{text}", `"${sub.text.length > 60 ? `${sub.text.slice(0, 57)}...` : sub.text}"`);
    await gitAdd(root, task.path);
    await gitCommitPaths(root, msg, task.path);
    committed = true;
  }
  return { path: task.path, checked, committed };
}
