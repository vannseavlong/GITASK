import * as vscode from "vscode";
import { applySync, listPeople, loadBoard, planSync, readGithubConfig, readPeople, repoRoot } from "gitask-core";
import type { Person, SyncPlan } from "gitask-core";

/** Classic OAuth scopes the VS Code GitHub provider can grant. `repo` covers issues; `project` covers Projects v2. */
const scopes = (project: boolean): string[] => (project ? ["repo", "project"] : ["repo"]);

/** Human-readable plan for the confirmation dialog. */
export function describePlan(plan: SyncPlan): string {
  const lines = [`Repo ${plan.repo}${plan.project ? `, project #${plan.project}` : ""}`];
  const n = (k: "create" | "update") => plan.issues.filter((i) => i.action === k).length;
  lines.push(`${n("create")} issue(s) to create, ${n("update")} to update, ${plan.issues.reduce((a, i) => a + i.subIssues.length, 0)} sub-issue(s).`);
  lines.push(plan.notify.length ? `GitHub may notify: ${plan.notify.map((x) => `@${x.login}`).join(", ")}` : "Nobody will be assigned or notified.");
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
    const root = await repoRoot(dir);
    const saved = await readPeople(dir);
    const people: Person[] = [...saved];
    for (const g of root ? await listPeople(root) : []) {
      const have = people.find((p) => p.id === g.id);
      if (!have) people.push(g);
      else have.github ??= g.github;
    }
    // Dry run first: no token is requested and nothing is sent until the user confirms.
    const plan = planSync(await loadBoard(dir), config, people);
    if (!plan.issues.length) return void vscode.window.showInformationMessage("GITASK: no tasks to sync.");
    const ok = await vscode.window.showWarningMessage("Sync to GitHub?", { modal: true, detail: describePlan(plan) }, "Sync");
    if (ok !== "Sync") return;
    const session = await vscode.authentication.getSession("github", scopes(!!config.project), { createIfNone: true });
    const r = await applySync(plan, session.accessToken);
    const made = r.issues.filter((i) => i.action === "created").length;
    vscode.window.showInformationMessage(`GITASK: synced ${r.issues.length} task(s) to ${plan.repo} (${made} new issue(s)).`);
    for (const w of r.warnings) log?.appendLine(`GitHub sync: ${w}`);
  } catch (e) {
    // GithubError messages never contain the token.
    vscode.window.showErrorMessage(`GITASK: GitHub sync failed. ${(e as Error).message}`);
  }
}
