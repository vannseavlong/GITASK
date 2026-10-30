import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, sep } from "node:path";
import type { GithubConfig } from "./config.ts";
import { gitAdd, gitCommitPaths, hasLocalChanges, isTracked, repoRoot } from "./git.ts";
import { fillTemplate } from "./template.ts";
import { isSubtaskSection } from "./parse.ts";
import type { Person } from "./people.ts";
import type { Board, Task } from "./types.ts";

/*
 * One-way sync of GITASK tasks to GitHub Issues. Plain `fetch`, no SDK. See Docs/architecture/github.md.
 * `planSync` is pure (no I/O). Nothing leaves the machine unless `applySync` is called with a token.
 */

export const ISSUE_MESSAGE = "task({id}): link GitHub issue #{n}";
export const MARKER = (id: string): string => `<!-- gitask:${id} -->`;
const DEFAULT_BASE = "https://api.github.com";
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const DONE_COLUMN = /^\d+-(done|deploy)\b/i;
const ISSUE_RE = /^#?(\d+)$/;
const ISSUE_LINE = /^(\s*[-*]\s+\*\*Issue:\*\*).*$/im;
const FIELD_LINE = /^\s*[-*]\s+\*\*[^*:]+:\*\*/;

export type GithubErrorKind = "auth" | "forbidden" | "not-found" | "invalid" | "rate-limit" | "offline" | "http";

/** A GitHub failure with a message that is safe to show: it never contains the token. */
export class GithubError extends Error {
  readonly kind: GithubErrorKind;
  readonly status?: number;
  constructor(kind: GithubErrorKind, message: string, status?: number) {
    super(message);
    this.name = "GithubError";
    this.kind = kind;
    this.status = status;
  }
}

/** Issue number from a header value like `#123` or `123`; `undefined` otherwise. */
export function parseIssueNumber(value: string | undefined): number | undefined {
  const m = ISSUE_RE.exec(value?.trim() ?? "");
  return m ? Number(m[1]) : undefined;
}

/** Return `content` with its header `- **Issue:** #n` line set (same placement rules as the ID and Owner lines). */
export function setIssueField(content: string, n: number): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let i = 0;
  if (/^﻿?---\s*$/.test(lines[0] ?? "")) {
    const end = lines.findIndex((l, k) => k > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (end > 0) i = end + 1;
  }
  const headerEnd = lines.findIndex((l, k) => k >= i && /^##\s/.test(l));
  const stop = headerEnd < 0 ? lines.length : headerEnd;
  const existing = lines.findIndex((l, k) => k >= i && k < stop && ISSUE_LINE.test(l));
  if (existing >= 0) {
    lines[existing] = lines[existing].replace(ISSUE_LINE, (_m, head: string) => `${head} #${n}`);
    return lines.join(eol);
  }
  const line = `- **Issue:** #${n}`;
  const firstField = lines.findIndex((l, k) => k >= i && k < stop && FIELD_LINE.test(l));
  if (firstField >= 0) lines.splice(firstField, 0, line);
  else {
    const title = lines.findIndex((l, k) => k >= i && /^#\s+/.test(l));
    if (title >= 0) lines.splice(title + 1, 0, "", line);
    else lines.splice(i, 0, line, "");
  }
  return lines.join(eol);
}

// ---------------------------------------------------------------- plan

export interface SyncSubPlan {
  /** Title of the sub-issue (the sub-task text). */
  title: string;
  state: "open" | "closed";
  assignees: string[];
}

export interface SyncIssuePlan {
  taskId: string;
  /** Absolute path of the task file (where `Issue: #n` is written). */
  path: string;
  title: string;
  /** Body for a NEW issue only; an existing issue's body is never overwritten. */
  body: string;
  state: "open" | "closed";
  /** GitHub logins, from `Owner`. */
  assignees: string[];
  action: "create" | "update";
  /** Existing issue number (action `update`). */
  issue?: number;
  /** Column label used for the Project Status (only when the config has a `project`). */
  status?: string;
  subIssues: SyncSubPlan[];
}

export interface SyncNotify {
  login: string;
  name: string;
  tasks: string[];
}

export interface SyncPlan {
  repo: string;
  project?: number;
  issues: SyncIssuePlan[];
  /** Who GitHub may notify. For an update only a CHANGED assignee is notified. */
  notify: SyncNotify[];
  /** People or owners that were skipped, and anything else the user should see before confirming. */
  warnings: string[];
}

export interface SyncOptions {
  /** Only these task ids (file names without `.md`). Default: every task outside the done and deploy columns, plus any already linked. */
  tasks?: string[];
}

const norm = (s: string): string => s.trim().toLowerCase();

function findPerson(people: Person[], who: string): Person | undefined {
  const k = norm(who);
  if (!k) return undefined;
  return people.find((p) => p.id === k || norm(p.name) === k || (p.github && norm(p.github) === k));
}

/**
 * What a sync WOULD do. Pure: no network, no file access. A person without a valid `github` name is
 * skipped with a warning, never guessed.
 */
export function planSync(board: Board, config: GithubConfig, people: Person[], opts: SyncOptions = {}): SyncPlan {
  const warnings: string[] = [];
  const issues: SyncIssuePlan[] = [];
  const notify = new Map<string, SyncNotify>();
  const warned = new Set<string>();
  const only = opts.tasks ? new Set(opts.tasks.map((t) => t.replace(/\.md$/, ""))) : undefined;
  const parent = dirname(board.dir);

  const warnOnce = (msg: string) => {
    if (!warned.has(msg)) {
      warned.add(msg);
      warnings.push(msg);
    }
  };
  /** The login to assign for an owner string, or undefined (with a warning). */
  const loginFor = (who: string | undefined, where: string): { login: string; name: string } | undefined => {
    if (!who?.trim()) return undefined;
    const p = findPerson(people, who);
    if (!p) {
      warnOnce(`${where}: "${who}" is not a known person; not assigned on GitHub.`);
      return undefined;
    }
    if (!p.github || !LOGIN_RE.test(p.github)) {
      warnOnce(`${p.name} has no GitHub name; skipped (set "github" for them in Tasks/gitask.json).`);
      return undefined;
    }
    return { login: p.github, name: p.name };
  };

  const col = new Map<Task, string>();
  for (const c of board.columns) for (const t of c.tasks) col.set(t, c.label);
  for (const c of board.columns) for (const t of c.tasks) {
    const linked = parseIssueNumber(t.fields.issue);
    if (only ? !only.has(t.id) : DONE_COLUMN.test(c.id) && linked === undefined) continue;
    const closed = DONE_COLUMN.test(c.id);
    const assignees: string[] = [];
    const owner = loginFor(t.owner, t.id);
    if (owner) {
      assignees.push(owner.login);
      note(notify, owner, t.id);
    }
    const subIssues: SyncSubPlan[] = [];
    for (const s of t.subtasks) {
      if (!isSubtaskSection(s.section) || !s.text.trim()) continue;
      const a = s.assignee ? loginFor(s.assignee, `${t.id} sub-task "${s.text}"`) : undefined;
      if (a) note(notify, a, `${t.id}: ${s.text}`);
      subIssues.push({ title: s.text.trim(), state: s.checked ? "closed" : "open", assignees: a ? [a.login] : [] });
    }
    const rel = relative(parent, t.path).split(sep).join("/");
    issues.push({
      taskId: t.id,
      path: t.path,
      title: t.title,
      body: `Tracked in GITASK: [\`${rel}\`](https://github.com/${config.repo}/blob/HEAD/${rel})\n\n${MARKER(t.id)}`,
      state: closed ? "closed" : "open",
      assignees,
      action: linked === undefined ? "create" : "update",
      ...(linked === undefined ? {} : { issue: linked }),
      ...(config.project ? { status: c.label } : {}),
      subIssues,
    });
  }
  if (only) for (const id of only) if (!issues.some((i) => i.taskId === id)) warnings.push(`Task not found: ${id}`);
  return { repo: config.repo, ...(config.project ? { project: config.project } : {}), issues, notify: [...notify.values()], warnings };
}

function note(map: Map<string, SyncNotify>, who: { login: string; name: string }, task: string): void {
  const e = map.get(who.login) ?? { login: who.login, name: who.name, tasks: [] };
  e.tasks.push(task);
  map.set(who.login, e);
}

// ---------------------------------------------------------------- apply

export interface ApplyOptions {
  /** Injectable for tests. Default: global `fetch`. */
  fetch?: typeof fetch;
  /** Default `https://api.github.com`. The token is sent only to this origin. */
  baseUrl?: string;
  /** Commit the `Issue:` header lines by pathspec (default true; tracked files only). */
  commit?: boolean;
  /** Per-request timeout in ms (default 30000). */
  timeoutMs?: number;
}

export interface SyncResult {
  issues: {
    taskId: string;
    number: number;
    url: string;
    action: "created" | "updated" | "unchanged";
    subIssues: { title: string; number: number; action: "created" | "updated" | "unchanged" }[];
    project?: "set" | "skipped";
  }[];
  /** Task files that got a new `Issue:` line. */
  written: string[];
  committed: boolean;
  warnings: string[];
}

interface Ctx {
  token: string;
  base: string;
  doFetch: typeof fetch;
  timeoutMs: number;
}

interface Json { [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

async function call(ctx: Ctx, method: string, path: string, body?: unknown): Promise<Json> {
  const scrub = (s: string) => s.split(ctx.token).join("***");
  let res: Response;
  try {
    res = await ctx.doFetch(ctx.base + path, {
      method,
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "gitask",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(ctx.timeoutMs),
    });
  } catch {
    // The underlying error is dropped on purpose: it can carry request details.
    throw new GithubError("offline", "Cannot reach GitHub. Check your connection and try again; no local file was changed by this request.");
  }
  let data: Json = {};
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = {};
    }
  }
  if (res.ok) return data;
  const msg = scrub(typeof data.message === "string" ? data.message : res.statusText || "request failed");
  const where = `${method} ${path.split("?")[0]}`;
  const remaining = res.headers.get("x-ratelimit-remaining");
  const retry = res.headers.get("retry-after");
  const reset = res.headers.get("x-ratelimit-reset");
  if (res.status === 429 || (res.status === 403 && (remaining === "0" || retry !== null || /rate limit/i.test(msg)))) {
    const when = retry ? `wait ${retry} s` : reset ? `resets at ${new Date(Number(reset) * 1000).toISOString()}` : "wait a minute";
    throw new GithubError("rate-limit", `GitHub rate limit reached (${when}), then run the sync again; already linked tasks are not duplicated.`, res.status);
  }
  if (res.status === 401) throw new GithubError("auth", "GitHub rejected the token (401): it is missing, expired or revoked. Sign in again or set a valid GITHUB_TOKEN.", 401);
  if (res.status === 403) throw new GithubError("forbidden", `GitHub refused (403): the token lacks permission for ${where}. ${msg}`, 403);
  if (res.status === 404) throw new GithubError("not-found", `Not found (404) for ${where}: the repo, issue or project does not exist, or the token cannot see it. ${msg}`, 404);
  if (res.status === 410) throw new GithubError("not-found", `Gone (410) for ${where}: issues may be disabled on this repo, or the issue was deleted.`, 410);
  if (res.status === 422) throw new GithubError("invalid", `GitHub rejected the data (422) for ${where}: ${msg}${detail(data)}`, 422);
  throw new GithubError("http", `GitHub error ${res.status} for ${where}: ${msg}`, res.status);
}

function detail(data: Json): string {
  const errs = Array.isArray(data.errors) ? data.errors : [];
  const parts = errs.map((e) => (typeof e === "string" ? e : [e?.field, e?.code, e?.value].filter(Boolean).join(" "))).filter(Boolean);
  return parts.length ? ` (${parts.join("; ")})` : "";
}

const logins = (a: unknown): string[] => (Array.isArray(a) ? a.map((x) => String((x as Json)?.login ?? "").toLowerCase()).filter(Boolean).sort() : []);
const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const lower = (a: string[]) => a.map((x) => x.toLowerCase()).sort();

/** Fields of an existing issue that differ from the plan, or `undefined` when it is already up to date. */
function diff(current: Json, want: { title: string; state: string; assignees: string[] }): Json | undefined {
  const patch: Json = {};
  if (current.title !== want.title) patch.title = want.title;
  if (current.state !== want.state) patch.state = want.state;
  if (!sameSet(logins(current.assignees), lower(want.assignees))) patch.assignees = want.assignees;
  return Object.keys(patch).length ? patch : undefined;
}

/**
 * Send the plan to GitHub. Creates or updates each issue (title, state, assignees from Owner), mirrors
 * `## Sub-tasks` as sub-issues (matched by title, so a second run updates instead of duplicating),
 * optionally sets the Project Status, then writes `- **Issue:** #n` into each new task's header and
 * commits those files by pathspec only. The token is used for the Authorization header only: it is never
 * logged, stored, or put into an error. A failure stops the run with a `GithubError`; a task whose issue
 * was not created is left untouched, and one already created keeps its `Issue:` line so a retry does not duplicate it.
 */
export async function applySync(plan: SyncPlan, token: string, opts: ApplyOptions = {}): Promise<SyncResult> {
  if (!token.trim()) throw new GithubError("auth", "No GitHub token. Sign in (VS Code) or set GITHUB_TOKEN.");
  const base = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/+$/, "");
  const ctx: Ctx = { token, base, doFetch: opts.fetch ?? fetch, timeoutMs: opts.timeoutMs ?? 30000 };
  const [owner, name] = plan.repo.split("/").map(encodeURIComponent);
  const repoPath = `/repos/${owner}/${name}`;
  const result: SyncResult = { issues: [], written: [], committed: false, warnings: [] };
  const project = plan.project ? await loadProject(ctx, plan) : undefined;
  const fresh: { path: string; taskId: string; n: number; dirty: boolean }[] = [];

  try {
    for (const it of plan.issues) {
      let number: number;
      let url: string;
      let action: "created" | "updated" | "unchanged";
      let issueObj: Json;
      if (it.action === "update" && it.issue !== undefined) {
        issueObj = await call(ctx, "GET", `${repoPath}/issues/${it.issue}`);
        if (issueObj.pull_request) throw new GithubError("invalid", `#${it.issue} (task ${it.taskId}) is a pull request, not an issue.`);
        const patch = diff(issueObj, it);
        if (patch) issueObj = { ...issueObj, ...(await call(ctx, "PATCH", `${repoPath}/issues/${it.issue}`, patch)) };
        action = patch ? "updated" : "unchanged";
      } else {
        issueObj = await call(ctx, "POST", `${repoPath}/issues`, { title: it.title, body: it.body, assignees: it.assignees });
        if (it.state === "closed") issueObj = { ...issueObj, ...(await call(ctx, "PATCH", `${repoPath}/issues/${issueObj.number}`, { state: "closed" })) };
        action = "created";
        const dirty = (await isTracked(dirname(it.path), it.path)) && (await hasLocalChanges(dirname(it.path), it.path));
        const raw = await readFile(it.path, "utf8");
        await writeFile(it.path, setIssueField(raw, issueObj.number as number));
        result.written.push(it.path);
        fresh.push({ path: it.path, taskId: it.taskId, n: issueObj.number as number, dirty });
      }
      number = issueObj.number as number;
      url = String(issueObj.html_url ?? "");
      const row: SyncResult["issues"][number] = { taskId: it.taskId, number, url, action, subIssues: [] };

      if (it.subIssues.length) {
        const existing: Json[] = action === "created" ? [] : asArray(await call(ctx, "GET", `${repoPath}/issues/${number}/sub_issues?per_page=100`));
        const used = new Set<unknown>();
        for (const s of it.subIssues) {
          const hit = existing.find((e) => !used.has(e.id) && e.title === s.title);
          if (hit) {
            used.add(hit.id);
            const patch = diff(hit, s);
            if (patch) await call(ctx, "PATCH", `${repoPath}/issues/${hit.number}`, patch);
            row.subIssues.push({ title: s.title, number: hit.number as number, action: patch ? "updated" : "unchanged" });
          } else {
            const child = await call(ctx, "POST", `${repoPath}/issues`, { title: s.title, assignees: s.assignees });
            await call(ctx, "POST", `${repoPath}/issues/${number}/sub_issues`, { sub_issue_id: child.id });
            if (s.state === "closed") await call(ctx, "PATCH", `${repoPath}/issues/${child.number}`, { state: "closed" });
            row.subIssues.push({ title: s.title, number: child.number as number, action: "created" });
          }
        }
      }

      if (project && it.status) {
        const ok = await setStatus(ctx, project, plan, number, it.status, result.warnings);
        row.project = ok ? "set" : "skipped";
      }
      result.issues.push(row);
    }
  } finally {
    // Runs on success and on failure: an issue that exists must keep its `Issue:` line, or a retry would duplicate it.
    if (fresh.length && opts.commit !== false) {
      try {
        for (const f of fresh) {
          const cwd = dirname(f.path);
          if (f.dirty || !(await isTracked(cwd, f.path))) continue;
          const root = await repoRoot(cwd);
          if (!root) continue;
          await gitAdd(root, f.path);
          await gitCommitPaths(root, fillTemplate(ISSUE_MESSAGE, { id: f.taskId, n: String(f.n) }), f.path);
          result.committed = true;
        }
      } catch {
        result.warnings.push("Issue numbers were written to the task files but the commit failed; commit them yourself.");
      }
    }
  }
  return result;
}

const asArray = (v: Json): Json[] => (Array.isArray(v) ? (v as unknown as Json[]) : []);

// ---------------------------------------------------------------- projects v2

interface ProjectInfo {
  base: string;
  statusFieldId: string | number;
  options: Map<string, string>;
}

const key = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function loadProject(ctx: Ctx, plan: SyncPlan): Promise<ProjectInfo | undefined> {
  const [owner] = plan.repo.split("/");
  const n = plan.project!;
  for (const kind of ["orgs", "users"]) {
    const base = `/${kind}/${encodeURIComponent(owner)}/projectsV2/${n}`;
    let fields: Json;
    try {
      fields = await call(ctx, "GET", `${base}/fields?per_page=100`);
    } catch (e) {
      if (e instanceof GithubError && e.kind === "not-found" && kind === "orgs") continue;
      throw e;
    }
    const status = asArray(fields).find((f) => key(String(f.name)) === "status" && f.data_type === "single_select");
    if (!status) throw new GithubError("not-found", `Project #${n} has no single-select "Status" field.`);
    const options = new Map<string, string>();
    for (const o of asArray(status.options as Json)) options.set(key(String(o.name?.raw ?? o.name)), String(o.id));
    return { base, statusFieldId: status.id as string | number, options };
  }
  throw new GithubError("not-found", `Project #${n} not found for "${owner}" (organization or user). The token may lack the Projects permission.`);
}

async function setStatus(ctx: Ctx, p: ProjectInfo, plan: SyncPlan, issue: number, column: string, warnings: string[]): Promise<boolean> {
  const option = p.options.get(key(column));
  if (!option) {
    const w = `Project has no Status option matching column "${column}"; status not set.`;
    if (!warnings.includes(w)) warnings.push(w);
    return false;
  }
  const [owner, repo] = plan.repo.split("/");
  const item = await call(ctx, "POST", `${p.base}/items`, { type: "Issue", owner, repo, number: issue });
  await call(ctx, "PATCH", `${p.base}/items/${item.id}`, { fields: [{ id: p.statusFieldId, value: option }] });
  return true;
}
