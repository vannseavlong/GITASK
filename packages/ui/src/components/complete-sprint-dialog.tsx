import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BoardData, Host } from "@/host/index.ts";
import { cn } from "@/lib/utils";
import type { SprintClosePlanView, SprintCloseSummaryView } from "@host-src/protocol.ts";
import { estimateUnit } from "@host-src/sprint-scope.ts";
import { applyToAll, confirmBlocker, knownActions, pointsText, resetTarget, successLines, summaryTiles, withAction, type CloseAction } from "@/lib/sprint-close.ts";

type Phase = "plan" | "applying" | "done";

/**
 * Complete sprint: plan first, then confirm (like the GitHub sync dialog). The host answers `sprintClosePlan` with the
 * plan and its hash without writing anything; changing an action or the reset checkbox asks for a new plan. Only the
 * confirm button sends `completeSprint { …, planHash, confirmed: true }`; the host plans again and refuses a stale hash
 * (the dialog then plans again and says so). On failure nothing changed and the dialog stays open.
 */
export function CompleteSprintDialog({ host, board, sprintId, open, onOpenChange, onPlanNext }: {
  host: Host;
  board: BoardData;
  /** The active sprint to complete. Kept while open, so a board update after the close does not change it. */
  sprintId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "Plan next sprint": the next sprint id when it exists after the close. */
  onPlanNext: (next: string | undefined) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("plan");
  const [plan, setPlan] = React.useState<SprintClosePlanView | null>(null);
  const [planHash, setPlanHash] = React.useState("");
  const [planning, setPlanning] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [bulk, setBulk] = React.useState<CloseAction>("backlog");
  const [done, setDone] = React.useState<{ summary: SprintCloseSummaryView; next?: string; committed?: boolean } | null>(null);
  const id = React.useRef(sprintId);
  const pendingPlans = React.useRef(0); // the host answers in order: only the answer to the last request is shown
  const lastSent = React.useRef<{ actions?: Record<string, CloseAction>; resetStatus?: string | null }>({});
  const retried = React.useRef(false);
  const applying = React.useRef(false);

  const cfg = board.sprints?.config;
  const unit = estimateUnit(cfg?.estimate ?? "none");
  const columns = board.columns.map((c) => c.id);
  const label = (col: string) => board.columns.find((c) => c.id === col)?.label ?? col;
  const reset = cfg ? resetTarget(cfg.resetStatus, columns, cfg.doneColumns) : undefined;

  const requestPlan = React.useCallback((req: { actions?: Record<string, CloseAction>; resetStatus?: string | null }) => {
    pendingPlans.current++;
    lastSent.current = req;
    setPlanning(true);
    host.send({ type: "sprintClosePlan", id: id.current, ...(req.actions ? { actions: req.actions } : {}), ...(req.resetStatus !== undefined ? { resetStatus: req.resetStatus } : {}) });
  }, [host]);

  React.useEffect(() => {
    if (!open) return;
    id.current = sprintId;
    pendingPlans.current = 0; applying.current = false; retried.current = false;
    setPhase("plan"); setPlan(null); setPlanHash(""); setError(""); setNotice(""); setDone(null); setBulk(cfg?.unfinished ?? "backlog");
    requestPlan({}); // config defaults first
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => host.onMessage((m) => {
    if (!open) return;
    if (m.type === "sprintClosePlanResult" && pendingPlans.current > 0) {
      if (--pendingPlans.current > 0) return; // a newer request is on its way
      if (m.plan && m.planHash) {
        // A task that left the sprint meanwhile (stale plan) would block the close: plan once more without it.
        const sent = lastSent.current.actions;
        const known = sent ? knownActions(sent, m.plan) : { actions: {}, dropped: 0 };
        if (sent && known.dropped && !retried.current) {
          retried.current = true;
          return requestPlan({ actions: known.actions, resetStatus: lastSent.current.resetStatus });
        }
        retried.current = false;
        setPlan(m.plan); setPlanHash(m.planHash); setError("");
      } else setError(m.error ?? "Could not build the plan.");
      setPlanning(false);
    } else if (m.type === "sprintCompleted" && applying.current) {
      applying.current = false;
      if (m.ok && m.summary) {
        setDone({ summary: m.summary, next: m.next, committed: m.committed });
        setPhase("done");
      } else {
        setPhase("plan");
        if (m.stale) {
          setError("");
          setNotice("The board changed since this plan was made, so nothing was changed. The plan below is new: check it and confirm again.");
          requestPlan({ actions: plan?.actions, resetStatus: plan?.resetStatus });
        } else setError(m.error ?? "The sprint was not completed. Nothing was changed.");
      }
    } else if (m.type === "error" && (pendingPlans.current > 0 || applying.current)) {
      // A rejected message (validation): nothing was written.
      pendingPlans.current = 0;
      setPlanning(false);
      if (applying.current) { applying.current = false; setPhase("plan"); }
      setError(`${m.message}${/nothing was changed/i.test(m.message) ? "" : " Nothing was changed."}`);
    }
  }), [host, open, plan, requestPlan]);

  const change = (actions: Record<string, CloseAction>, resetStatus: string | null) => { setNotice(""); setError(""); requestPlan({ actions, resetStatus }); };
  const confirm = () => {
    if (!plan) return;
    applying.current = true;
    setPhase("applying"); setError(""); setNotice("");
    host.send({ type: "completeSprint", id: plan.id, actions: plan.actions, resetStatus: plan.resetStatus, planHash, confirmed: true });
  };

  const why = confirmBlocker({ planning, applying: phase === "applying", hasPlan: Boolean(plan), blockers: plan?.blockers ?? [] });
  const sprint = board.sprints?.list.find((s) => s.id === sprintId);
  const toNext = plan?.unfinished.some((u) => u.action === "next") ?? false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (phase !== "applying") onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-auto" aria-describedby="complete-sprint-desc">
        <DialogHeader>
          <DialogTitle>{phase === "done" ? `${sprintId} completed` : `Complete ${sprintId}${sprint ? ` · ${sprint.name}` : ""}`}</DialogTitle>
          <DialogDescription id="complete-sprint-desc">
            {phase === "done" ? "The sprint is closed and its summary is written to the sprint file." : "Done tasks stay where they are. Choose what happens to each unfinished task. Nothing changes until you confirm."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-xs">
          {notice && <p role="status" className="rounded border border-border p-2 font-medium">{notice}</p>}
          {error && <p role="alert" className="rounded border border-destructive p-2 text-destructive">{error}</p>}

          {phase === "done" && done && (
            <section aria-label="Sprint summary" className="grid gap-1">
              <p className="m-0 flex items-center gap-1.5 text-sm font-semibold"><CheckCircle2 className="size-4 text-progress" aria-hidden />{successLines(sprintId, done.summary, plan?.next ?? `S${Number(sprintId.slice(1)) + 1}`, unit)[0]}</p>
              {successLines(sprintId, done.summary, plan?.next ?? `S${Number(sprintId.slice(1)) + 1}`, unit).slice(1).map((l) => <p key={l} className="m-0">{l}</p>)}
              <p className="m-0 opacity-80">{done.committed ? "Saved in one commit." : "Files changed; nothing was committed (auto-commit is off or the files are not tracked)."}</p>
            </section>
          )}

          {phase !== "done" && !plan && !error && <p role="status">Building the plan…</p>}

          {phase !== "done" && plan && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Summary">
                {summaryTiles(plan.summary, unit).map((t) => (
                  <div key={t.label} className="rounded-md border border-border bg-sidebar p-2">
                    <div className="text-[11px] uppercase opacity-80">{t.label}</div>
                    <div className="text-lg font-semibold leading-tight">{t.value}</div>
                    {t.detail && <div className="text-[11px] opacity-80">{t.detail}</div>}
                  </div>
                ))}
              </div>

              {plan.unfinished.length === 0 ? (
                <p role="status" className="opacity-80">Every task of {plan.id} is done. Nothing moves.</p>
              ) : (
                <section aria-label="Unfinished tasks" className="grid gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 mr-auto text-xs font-semibold">Unfinished ({plan.unfinished.length})</h3>
                    <Select value={bulk} onValueChange={(v) => setBulk(v as CloseAction)} disabled={phase === "applying"}>
                      <SelectTrigger aria-label="Action for all unfinished tasks" className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="next">Next sprint ({plan.next})</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-7" disabled={phase === "applying"} onClick={() => change(applyToAll(plan, bulk), plan.resetStatus)}>Apply to all</Button>
                  </div>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border text-left opacity-80">
                          <th className="p-1.5 font-medium">Task</th>
                          <th className="p-1.5 font-medium">Status</th>
                          {unit && <th className="p-1.5 text-right font-medium">Est.</th>}
                          <th className="p-1.5 font-medium">Action</th>
                          <th className="p-1.5 font-medium">Goes to</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.unfinished.map((u) => (
                          <tr key={u.path} data-testid="close-row" className="border-b border-border last:border-0">
                            <td className="p-1.5 align-middle">
                              <span className="mr-1 font-mono text-[11px] opacity-70">{u.label}</span>
                              <span className="break-words">{u.title}</span>
                              {(u.claimedBy || u.worktree) && <span className="ml-1 rounded border border-border px-1 text-[10px]" title={u.claimedBy ? `Claimed by ${u.claimedBy}` : `Worktree ${u.worktree}`}>claimed</span>}
                            </td>
                            <td className="p-1.5 whitespace-nowrap">{label(u.column)}</td>
                            {unit && <td className="p-1.5 text-right whitespace-nowrap">{u.estimate !== undefined ? pointsText(u.estimate, unit) : "–"}</td>}
                            <td className="p-1.5">
                              <Select value={u.action} disabled={phase === "applying"} onValueChange={(v) => change(withAction(plan.actions, u.path, v as CloseAction), plan.resetStatus)}>
                                <SelectTrigger aria-label={`Action for ${u.title}`} className="h-7 w-32 text-xs sm:w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="backlog">Backlog</SelectItem>
                                  <SelectItem value="next">Next sprint ({plan.next})</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5 whitespace-nowrap">{u.action === "next" ? `${plan.next} · ${label(u.to)}` : label(u.to)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reset && (
                    <label className={cn("flex items-start gap-2", !toNext && "opacity-70")}>
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={plan.resetStatus !== null}
                        disabled={phase === "applying"}
                        onChange={(e) => change(plan.actions, e.target.checked ? reset : null)}
                      />
                      <span>Reset status to {label(reset)} for tasks going to {plan.next}{toNext ? "" : " (none now)"}. Unticked, they keep their status.</span>
                    </label>
                  )}
                </section>
              )}

              {plan.done.length > 0 && (
                <details>
                  <summary className="cursor-pointer">Done ({plan.done.length}): stay where they are</summary>
                  <ul className="m-0 mt-1 list-none p-0">
                    {plan.done.map((t) => <li key={t.path}><span className="mr-1 font-mono text-[11px] opacity-70">{t.label}</span>{t.title}{unit && t.estimate !== undefined ? ` · ${pointsText(t.estimate, unit)}` : ""}</li>)}
                  </ul>
                </details>
              )}

              {plan.warnings.length > 0 && (
                <section aria-label="Warnings" className="rounded border border-border p-2">
                  <h3 className="m-0 text-xs font-semibold">Warnings</h3>
                  <ul className="m-0 list-disc pl-4">{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                </section>
              )}
              {plan.blockers.length > 0 && (
                <section aria-label="Blockers" className="rounded border border-destructive p-2 text-destructive">
                  <h3 className="m-0 text-xs font-semibold">Cannot complete {plan.id}</h3>
                  <ul className="m-0 list-disc pl-4">{plan.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-wrap items-center">
          {phase === "done" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => { onOpenChange(false); onPlanNext(done?.next); }}>Plan next sprint</Button>
            </>
          ) : (
            <>
              {why && plan && phase !== "applying" && <span id="complete-sprint-why" className={cn("mr-auto text-xs", plan.blockers.length ? "text-destructive" : "opacity-80")}>{why}</span>}
              <Button variant="outline" disabled={phase === "applying"} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={Boolean(why)} aria-describedby={why ? "complete-sprint-why" : undefined} onClick={confirm}>
                {phase === "applying" ? `Completing ${sprintId}…` : `Complete ${sprintId}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
