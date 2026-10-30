import * as React from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Host } from "@/host/index.ts";
import type { GithubPlanView } from "@host-src/protocol.ts";

type Phase = "loading" | "plan" | "syncing" | "done";

/**
 * Dry run first: the host answers `githubPlan` without contacting GitHub. Only the confirm button sends
 * `githubSync`, and the host (never this page) holds the token.
 */
export function GithubDialog({ host, github, open, onOpenChange }: { host: Host; github?: { repo: string; project?: number }; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [plan, setPlan] = React.useState<GithubPlanView | null>(null);
  const [error, setError] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [ack, setAck] = React.useState(false);

  React.useEffect(() => host.onMessage((m) => {
    if (m.type === "githubPlanResult") { setPlan(m.plan ?? null); setError(m.error ?? ""); setPhase("plan"); }
    if (m.type === "githubSyncResult") {
      setPhase("done");
      setError(m.ok ? "" : (m.error ?? "Sync failed."));
      setSummary(m.ok ? (m.summary ?? "Synced.") : "");
      setWarnings(m.warnings ?? []);
    }
  }), [host]);

  React.useEffect(() => {
    if (!open) return;
    if (!github) { setPhase("done"); setError(""); setSummary(""); setWarnings([]); setAck(false); return; }
    setPhase("loading"); setPlan(null); setError(""); setSummary(""); setWarnings([]); setAck(false);
    host.send({ type: "githubPlan" });
  }, [open, host, github]);

  const created = plan?.issues.filter((i) => i.action === "create").length ?? 0;
  const updated = (plan?.issues.length ?? 0) - created;
  const subs = plan?.issues.reduce((a, i) => a + i.subIssues.length, 0) ?? 0;
  const empty = !!plan && plan.issues.length === 0;
  const mismatch = plan?.repoMismatch;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (phase !== "syncing") onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto" aria-describedby="github-desc">
          <DialogHeader>
            <DialogTitle>Sync to GitHub</DialogTitle>
            <DialogDescription id="github-desc">{github ? `Creates or updates issues in ${github.repo}${github.project ? ` and project #${github.project}` : ""}. This is a preview: nothing is sent until you confirm.` : "Set up GitHub sync in Tasks/gitask.json, then open this dialog to preview and confirm."}</DialogDescription>
          </DialogHeader>
        <div className="grid gap-3 text-xs">
          {!github && (
            <section aria-label="GitHub not configured" className="rounded border border-border p-3 text-muted-foreground">
              <p role="status" className="m-0 font-semibold">GitHub sync is not set up.</p>
              <p className="m-0 mt-1">Add this to `Tasks/gitask.json`, then open the board again:</p>
              <code className="block mt-1 font-mono text-xs bg-background p-1 rounded border border-border">{`{  "github": { "repo": "owner/name", "project": 3 } }`}</code>
              <p className="m-0 mt-1 opacity-80">`gitask github plan` previews changes; confirm sends them. Token comes from the host, never from this page.</p>
            </section>
          )}
          {phase === "loading" && github && <p role="status">Building the preview…</p>}
          {error && <div role="alert" className="text-destructive">{error}</div>}
          {phase === "done" && summary && <p role="status">{summary}</p>}
          {phase === "done" && warnings.map((w) => <p key={w} className="opacity-80">Warning: {w}</p>)}
          {plan && phase !== "done" && (
            <>
              {mismatch && (
                <section aria-label="Repository mismatch" className="grid gap-2 rounded border-2 border-destructive p-2 text-destructive">
                  <p role="alert" className="m-0 font-semibold">Warning: this is not your origin repository.</p>
                  <p className="m-0">{mismatch.message}</p>
                  <label className="flex items-start gap-2 font-medium">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                    <span>I understand: send these task titles to {mismatch.configured}</span>
                  </label>
                </section>
              )}
              <p role="status">{created} issue(s) to create, {updated} to update, {subs} sub-issue(s).</p>
              <ul className="m-0 max-h-48 list-none overflow-auto rounded border border-border p-1" aria-label="Planned issues">
                {plan.issues.map((i) => (
                  <li key={i.taskId} className="py-0.5">
                    <span className="mr-1.5 rounded border border-border px-1">{i.action === "create" ? "new" : `update #${i.issue}`}</span>
                    {i.title}{i.assignees.length > 0 && <span className="opacity-70"> → {i.assignees.map((a) => `@${a}`).join(", ")}</span>}
                    {i.subIssues.length > 0 && <span className="opacity-70"> ({i.subIssues.length} sub-issues)</span>}
                  </li>
                ))}
                {empty && <li className="opacity-70">No tasks to sync.</li>}
              </ul>
              <section aria-label="Who GitHub may notify">
                <h3 className="m-0 text-xs font-semibold">Who GitHub may notify</h3>
                {plan.notify.length === 0 ? <p className="m-0 opacity-80">Nobody will be assigned or notified.</p> : (
                  <ul className="m-0 list-none p-0">
                    {plan.notify.map((n) => <li key={n.login}>@{n.login} ({n.name}): {n.tasks.join(", ")}</li>)}
                  </ul>
                )}
              </section>
              {plan.warnings.length > 0 && (
                <section aria-label="Warnings">
                  <h3 className="m-0 text-xs font-semibold">Warnings</h3>
                  <ul className="m-0 list-none p-0">{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={phase === "syncing"} onClick={() => onOpenChange(false)}>{phase === "done" ? "Close" : "Cancel"}</Button>
          {phase !== "done" && (
            <Button disabled={!plan || empty || phase !== "plan" || (!!mismatch && !ack)} onClick={() => { if (!plan) return; setPhase("syncing"); setError(""); host.send({ type: "githubSync", confirmRepo: plan.repo, planHash: plan.hash }); }}>
              <CloudUpload /> {phase === "syncing" ? "Syncing…" : "Confirm and sync"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
