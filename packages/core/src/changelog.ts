import { localDate } from "./date.ts";
import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { parseTask } from "./parse.ts";

export interface ChangelogOptions {
  /** Path of the task relative to the repo root, used as the idempotency key. */
  taskRelPath: string;
  date?: string;
  type?: string;
}

/** Build the entry text for a task, following the format in `Tasks/README.md`. */
export function changelogEntry(content: string, absPath: string, opts: ChangelogOptions): string {
  const t = parseTask(absPath, "", content);
  const date = opts.date ?? localDate();
  const branch = t.fields["branch"] ?? t.fields["worktree"]?.match(/Branch:\*\*\s*(\S+)/)?.[1];
  const lines = [
    `## ${date} · [${t.prefix || "Cross"}] ${opts.type ?? "feat"}: ${t.title}`,
    `- Owner: ${t.owner ?? "unknown"}`,
    `- Task: ${opts.taskRelPath}`,
  ];
  if (branch) lines.push(`- Branch/PR: ${branch}`);
  const goal = content.match(/^##\s+Goal\s*\n+([^\n#]+)/m)?.[1]?.trim();
  if (goal && !goal.startsWith("<")) lines.push(`- What changed: ${goal}`);
  return lines.join("\n") + "\n";
}

/** Insert an entry under the header of CHANGELOG.md. Idempotent: skips if the task path is already listed. */
export async function appendChangelog(
  changelogPath: string,
  taskPath: string,
  repoRoot: string,
  opts: Omit<ChangelogOptions, "taskRelPath"> = {},
): Promise<boolean> {
  const taskRelPath = relative(repoRoot, taskPath);
  const [log, task] = await Promise.all([readFile(changelogPath, "utf8"), readFile(taskPath, "utf8")]);
  if (log.includes(`- Task: ${taskRelPath}\n`)) return false;
  const entry = changelogEntry(task, taskPath, { ...opts, taskRelPath });
  const firstEntry = log.search(/^## /m);
  const next = firstEntry === -1 ? `${log.trimEnd()}\n\n${entry}` : `${log.slice(0, firstEntry)}${entry}\n${log.slice(firstEntry)}`;
  await writeFile(changelogPath, next);
  return true;
}
