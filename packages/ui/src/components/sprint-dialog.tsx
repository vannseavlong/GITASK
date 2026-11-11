import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/edit-dialogs.tsx";
import type { Host } from "@/host/index.ts";
import { MAX_SPRINT_GOAL, MAX_SPRINT_NAME, draftFields, draftOf, type PlanSprint, type SprintDraft } from "@/lib/sprint-plan.ts";

/**
 * New sprint (no `sprint`) or Edit sprint: name, goal, dates and capacity. Sends `createSprint` / `updateSprint` and waits
 * for the host's `sprintSaved` (or a rejection `error`): closes on success, else stays open with the draft and the reason.
 * `onSaved` gets the sprint id. The capacity field is hidden when estimates are off (`unit` undefined).
 */
export function SprintDialog({ host, sprint, nextName, unit, lengthDays, open, onOpenChange, onSaved }: {
  host: Host;
  sprint?: PlanSprint;
  /** Placeholder for the name of a new sprint (`Sprint 3`). */
  nextName: string;
  unit?: string;
  lengthDays: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}) {
  const [draft, setDraft] = React.useState<SprintDraft>(() => draftOf(sprint));
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const pending = React.useRef(false);

  React.useEffect(() => {
    if (!open) return;
    setDraft(draftOf(sprint)); setError(""); setSaving(false); pending.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => host.onMessage((m) => {
    if (!pending.current) return;
    if (m.type === "sprintSaved" && m.action === (sprint ? "update" : "create")) {
      pending.current = false;
      setSaving(false);
      if (m.ok) { onOpenChange(false); if (m.id) onSaved?.(m.id); }
      else setError(m.error ?? "Could not save the sprint.");
    } else if (m.type === "error") {
      pending.current = false;
      setSaving(false);
      setError(m.message);
    }
  }), [host, sprint, onOpenChange, onSaved]);

  const set = (k: keyof SprintDraft) => (e: React.ChangeEvent<HTMLInputElement>) => { setDraft((d) => ({ ...d, [k]: e.target.value })); setError(""); };

  const submit = () => {
    const r = draftFields(draft, sprint);
    if (!r.ok) return setError(r.error);
    if (sprint && !Object.keys(r.fields).length) return onOpenChange(false); // nothing changed
    pending.current = true;
    setSaving(true);
    host.send(sprint ? { type: "updateSprint", id: sprint.id, patch: r.fields } : { type: "createSprint", sprint: r.fields });
  };

  const title = sprint ? `Edit ${sprint.id}` : "New sprint";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96 max-w-[calc(100vw-2rem)]" aria-describedby="sprint-dialog-desc">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="sprint-dialog-desc">
            {sprint ? "Change the name, goal, dates or capacity. The state changes with Start sprint." : `Planned until you start it. Without dates, Start sprint sets them (${lengthDays} days from that day).`}
          </DialogDescription>
        </DialogHeader>
        <form noValidate className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Name" htmlFor="sprint-name">
            <Input id="sprint-name" autoFocus value={draft.name} placeholder={sprint ? undefined : nextName} maxLength={MAX_SPRINT_NAME} onChange={set("name")} />
          </Field>
          <Field label="Goal" htmlFor="sprint-goal">
            <Input id="sprint-goal" value={draft.goal} placeholder="What this sprint should achieve" maxLength={MAX_SPRINT_GOAL} onChange={set("goal")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor="sprint-start"><Input id="sprint-start" type="date" value={draft.start} onChange={set("start")} /></Field>
            <Field label="End" htmlFor="sprint-end"><Input id="sprint-end" type="date" value={draft.end} min={draft.start || undefined} onChange={set("end")} /></Field>
          </div>
          {unit && (
            <Field label={`Capacity (${unit})`} htmlFor="sprint-capacity">
              <Input id="sprint-capacity" inputMode="decimal" value={draft.capacity} placeholder="e.g. 30" className="w-32" onChange={set("capacity")} />
            </Field>
          )}
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : sprint ? "Save" : "Create sprint"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
