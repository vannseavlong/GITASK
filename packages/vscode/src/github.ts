import * as vscode from "vscode";
import { applySync, readGithubConfig } from "gitask-core";
import type { SyncPlan, SyncResult } from "gitask-core";
import { buildPlan, confirmProblem } from "./github-plan.ts";

/** Classic OAuth scopes the VS Code GitHub provider can grant. `repo` covers issues; `project` covers Projects v2. */
const scopes = (project: boolean): string[] => (project ? ["repo", "project"] : ["repo"]);

/** Human-readable plan for the confirmation dialog. */
export function describePlan(plan: SyncPlan): string {
  const lines = [`Repo ${plan.repo}${plan.project ? `, project #${plan.project}` : ""}`];
  const n = (k: "create" | "update") => plan.issues.filter((i) => i.action === k).length;
  lines.push(`${n("create")} issue(s) to create, ${n("update")} to update, ${plan.issues.reduce((a, i) => a + i.subIssues.length, 0)} sub-issue(s).`);
  lines.push(plan.notify.length ? `GitHub may notify: ${plan.notify.map((x) => `@${x.login}`).join(", ")}` : "Nobody will be assigned or notified.");
  if (plan.repoMismatch) lines.unshift(`WARNING: ${plan.repoMismatch.message}`);
  for (const w of plan.warnings) lines.push(`Warning: ${w}`);
  return lines.join("\n");
}

export async function syncGithub(dir: string | undefined, log?: vscode.OutputChannel): Promise<void> {
  if (!dir) return void vscode.window.showErrorMessage("GITASK: open a folder first.");
  const config = await readGithubConfig(dir);
  if (!config) {
    return void vscode.window.showInformationMessage('GITASK: add {"github": {"repo": "owner/name"}} to Tasks/gitask.json to enable GitHub sync. Nothing was sent.');
  }
  try {
    // Dry run first: no token is requested and nothing is sent until the user confirms.
    const built = await buildPlan(dir);
    if (!built.ok) return void vscode.window.showErrorMessage(`GITASK: ${built.error}`);
    const plan = built.plan;
    if (!plan.issues.length) return void vscode.window.showInformationMessage("GITASK: no tasks to sync.");
    const ok = await vscode.window.showWarningMessage("Sync to GitHub?", { modal: true, detail: describePlan(plan) }, "Sync");
    if (ok !== "Sync") return;
    if (plan.repoMismatch) {
      // Second, separate acknowledgement: the target repo comes from a file other contributors can change.
      const again = await vscode.window.showWarningMessage(`Send task titles to ${plan.repo}?`, { modal: true, detail: plan.repoMismatch.message }, `Send to ${plan.repo}`);
      if (again !== `Send to ${plan.repo}`) return;
    }
    const session = await vscode.authentication.getSession("github", scopes(!!config.project), { createIfNone: true });
    const r = await applySync(plan, session.accessToken, { allowRepo: plan.repo });
    const made = r.issues.filter((i) => i.action === "created").length;
    vscode.window.showInformationMessage(`GITASK: synced ${r.issues.length} task(s) to ${plan.repo} (${made} new issue(s)).`);
    for (const w of r.warnings) log?.appendLine(`GitHub sync: ${w}`);
  } catch (e) {
    // GithubError messages never contain the token.
    vscode.window.showErrorMessage(`GITASK: GitHub sync failed. ${(e as Error).message}`);
  }
}

/**
 * Apply from the webview dialog. The dialog already showed the dry-run plan and the user confirmed it, so there is
 * no second modal. The plan is recomputed here (the webview never supplies one) and the token stays in this process.
 */
export async function syncFromDialog(dir: string, m: { confirmRepo: string; planHash: string }): Promise<SyncResult & { repo: string }> {
  const config = await readGithubConfig(dir);
  const built = await buildPlan(dir);
  if (!config || !built.ok) throw new Error(built.ok ? "No GitHub link in Tasks/gitask.json." : built.error);
  const bad = confirmProblem(built.plan, m); // before any token is requested
  if (bad) throw new Error(bad);
  const session = await vscode.authentication.getSession("github", scopes(!!config.project), { createIfNone: true });
  return { ...(await applySync(built.plan, session.accessToken, { allowRepo: m.confirmRepo })), repo: built.plan.repo };
}
