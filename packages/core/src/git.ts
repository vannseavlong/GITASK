import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  // Literal pathspecs: a file named `a[12].md` or `Fix *.md` must match only itself.
  const { stdout } = await run("git", args, { cwd, env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" } });
  return stdout.trim();
}

/** URL of the `origin` remote (read-only), or undefined when there is none or `cwd` is not in a repo. */
export async function originUrl(cwd: string): Promise<string | undefined> {
  try {
    return (await git(cwd, ["remote", "get-url", "origin"])) || undefined;
  } catch {
    return undefined;
  }
}

/** Repo root containing `cwd`, or undefined when not inside a git repo. */
export async function repoRoot(cwd: string): Promise<string | undefined> {
  try {
    return await git(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return undefined;
  }
}

export async function isTracked(cwd: string, file: string): Promise<boolean> {
  try {
    await git(cwd, ["ls-files", "--error-unmatch", "--", file]);
    return true;
  } catch {
    return false;
  }
}

export const gitMv = (cwd: string, from: string, to: string) => git(cwd, ["mv", "--", from, to]);
export const gitAdd = (cwd: string, ...paths: string[]) => git(cwd, ["add", "--", ...paths]);

/** Commit only the given paths. Never `git add -A`, so other staged or dirty files stay untouched. */
export const gitCommitPaths = (cwd: string, message: string, ...paths: string[]) =>
  git(cwd, ["commit", "-m", message, "--", ...paths]);

/** Remove a file from the index and the working tree, even with local edits (the caller has confirmed). */
export const gitRm = (cwd: string, file: string) => git(cwd, ["rm", "-q", "-f", "--", file]);

/** True when the file has uncommitted changes (modified, staged or untracked). */
export async function hasLocalChanges(cwd: string, file: string): Promise<boolean> {
  try {
    return (await git(cwd, ["status", "--porcelain", "--", file])).length > 0;
  } catch {
    return false;
  }
}

/** One commit that touched a file, as seen by `git log --follow`. */
export interface FileChange {
  hash: string;
  /** Committer date, `YYYY-MM-DD`. */
  date: string;
  /** `A`, `M`, `R`, ... (first letter of git's name-status). */
  status: string;
  /** Path before the commit (renames only). */
  from?: string;
  /** Path after the commit. */
  to: string;
}

/**
 * History of one file across renames, newest first (read-only). Paths are relative to the repo root.
 * An untracked file, a path outside a repo or any git error yields `[]`, never throws.
 */
export async function fileHistory(cwd: string, file: string): Promise<FileChange[]> {
  let out: string;
  try {
    out = await git(cwd, ["log", "--follow", "-M", "--name-status", "--format=%x01%H%x09%cs", "--", file]);
  } catch {
    return [];
  }
  const changes: FileChange[] = [];
  for (const chunk of out.split("\x01")) {
    const [head, ...rest] = chunk.split(/\r?\n/).filter((l) => l.trim());
    if (!head) continue;
    const [hash, date] = head.split("\t");
    const cols = rest[0]?.split("\t");
    if (!hash || !date || !cols || cols.length < 2) continue;
    const status = cols[0][0];
    changes.push(status === "R" || status === "C" ? { hash, date, status, from: cols[1], to: cols[2] ?? cols[1] } : { hash, date, status, to: cols[1] });
  }
  return changes;
}
