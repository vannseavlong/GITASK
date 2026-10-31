import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Commits that touched task files on one day (committer date, `YYYY-MM-DD`). */
export interface ActivityDay {
  date: string;
  count: number;
}

export interface ActivityOptions {
  /** How far back to look. Default 365. */
  days?: number;
  /** Most commits read from the log, newest first. Keeps huge histories cheap. Default 20000. */
  maxCommits?: number;
}

const MARK = "@@";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BUFFER = 32 * 1024 * 1024;

/**
 * Activity per day under `dir` (the Tasks folder) for the last `days` days: how many commits touched
 * a file there. One `git log` process, committer dates, literal pathspec. Days without commits are
 * left out; the result is sorted by date. Returns `[]` outside a git repo, in an empty repo or on any
 * error; it never throws.
 */
export async function taskActivity(dir: string, opts: ActivityOptions = {}): Promise<ActivityDay[]> {
  const days = Number.isFinite(opts.days) && (opts.days as number) > 0 ? Math.floor(opts.days as number) : 365;
  const max = Number.isFinite(opts.maxCommits) && (opts.maxCommits as number) > 0 ? Math.floor(opts.maxCommits as number) : 20000;
  try {
    const { stdout } = await run(
      "git",
      ["-c", "core.quotepath=false", "log", `--since=${days} days ago`, `--max-count=${max}`, "--name-only", "--relative", `--pretty=format:${MARK}%cs`, "--", "."],
      { cwd: dir, env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" }, maxBuffer: MAX_BUFFER, timeout: 15_000 },
    );
    const counts = new Map<string, number>();
    let date = "";
    let touched = false;
    const flush = () => {
      if (date && touched) counts.set(date, (counts.get(date) ?? 0) + 1);
    };
    for (const line of stdout.split("\n")) {
      if (line.startsWith(MARK)) {
        flush();
        const d = line.slice(MARK.length).trim();
        date = DATE.test(d) ? d : "";
        touched = false;
      } else if (line.trim()) {
        touched = true;
      }
    }
    flush();
    return [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
  } catch {
    return [];
  }
}

const cache = new Map<string, { key: string; value: ActivityDay[] }>();

async function headOf(dir: string): Promise<string | undefined> {
  try {
    const { stdout } = await run("git", ["rev-parse", "HEAD"], { cwd: dir });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * `taskActivity`, remembered per folder until HEAD changes (or the calendar day does), so a board
 * refresh after a file edit does not run `git log` again. Not a git repo or no commits: `[]`.
 */
export async function taskActivityCached(dir: string, opts: ActivityOptions = {}, now: Date = new Date()): Promise<ActivityDay[]> {
  const head = await headOf(dir);
  if (!head) return [];
  const key = `${head}|${now.toDateString()}|${opts.days ?? ""}|${opts.maxCommits ?? ""}`;
  const hit = cache.get(dir);
  if (hit && hit.key === key) return hit.value;
  const value = await taskActivity(dir, opts);
  if (value.length > 0) cache.set(dir, { key, value }); // an empty result may be a failure (timeout, huge output): retry next time
  return value;
}
