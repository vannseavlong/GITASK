import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd });
  return stdout.trim();
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
