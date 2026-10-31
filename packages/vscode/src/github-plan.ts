// Dry-run side of GitHub sync, shared by the VS Code extension and `gitask serve`. No vscode import and no
// network: it only reads the board, people and config. The token is never touched here.
import { listPeople, loadBoard, planSync, readGithubConfig, readOriginRepo, readPeople, repoRoot } from "gitask-core";
import type { Person, SyncPlan, SyncResult } from "gitask-core";
import type { GithubPlanView, HostMessage } from "./protocol.ts";

export type PlanOutcome = { ok: true; plan: SyncPlan } | { ok: false; error: string };

/** The plan for a Tasks dir: saved people plus git contributors, merged like the CLI does. */
export async function buildPlan(dir: string): Promise<PlanOutcome> {
  const config = await readGithubConfig(dir);
  if (!config) return { ok: false, error: 'No GitHub link. Add {"github": {"repo": "owner/name"}} to Tasks/gitask.json. Nothing was sent.' };
  const saved = await readPeople(dir).catch(() => [] as Person[]);
  const people: Person[] = [...saved];
  const root = await repoRoot(dir).catch(() => undefined);
  for (const g of root ? await listPeople(root).catch(() => [] as Person[]) : []) {
    const have = people.find((p) => p.id === g.id);
    if (!have) people.push(g);
    else have.github ??= g.github;
  }
  return { ok: true, plan: planSync(await loadBoard(dir), config, people, { origin: await readOriginRepo(dir) }) };
}

/** What the webview may see of a plan: no file paths, no issue bodies. */
export function toPlanView(plan: SyncPlan): GithubPlanView {
  return {
    repo: plan.repo,
    hash: plan.hash,
    repoMismatch: plan.repoMismatch,
    project: plan.project,
    issues: plan.issues.map((i) => ({
      taskId: i.taskId, title: i.title, action: i.action, issue: i.issue, state: i.state, assignees: i.assignees,
      subIssues: i.subIssues.map((s) => ({ title: s.title, state: s.state, assignees: s.assignees })),
    })),
    notify: plan.notify.map((n) => ({ login: n.login, name: n.name, tasks: n.tasks })),
    warnings: plan.warnings,
  };
}

/**
 * Why a `githubSync` must not run, or undefined when it may: the user confirmed another repo than the one the host
 * would use, or the plan changed since the user saw it. Nothing has been sent at this point.
 */
export function confirmProblem(plan: SyncPlan, m: { confirmRepo: string; planHash: string }): string | undefined {
  if (m.confirmRepo.toLowerCase() !== plan.repo.toLowerCase()) return `You confirmed ${m.confirmRepo}, but the sync would go to ${plan.repo} (Tasks/gitask.json changed). Nothing was sent; review the preview again.`;
  if (m.planHash !== plan.hash) return "The tasks or settings changed since you opened the preview. Nothing was sent; review the preview again.";
  return undefined;
}

/** The reply for a finished sync. Counts and warnings only. */
export function syncResultMessage(r: SyncResult, repo: string): Extract<HostMessage, { type: "githubSyncResult" }> {
  const made = r.issues.filter((i) => i.action === "created").length;
  return { type: "githubSyncResult", ok: true, summary: `Synced ${r.issues.length} task(s) to ${repo} (${made} new issue(s)).`, warnings: r.warnings };
}

/** Error text for a failed sync. GithubError messages never hold the token; anything else is scrubbed of `token` anyway. */
export function syncErrorMessage(e: unknown, token?: string): Extract<HostMessage, { type: "githubSyncResult" }> {
  let msg = e instanceof Error ? e.message : String(e);
  if (token) msg = msg.split(token).join("***");
  return { type: "githubSyncResult", ok: false, error: msg };
}

/** Options for `applySync` from the `gitask.autoCommit` setting (default on): off means issue numbers are written but never committed. */
export function applyOptions(autoCommit: boolean | undefined): { commit: boolean } {
  return { commit: autoCommit !== false };
}
