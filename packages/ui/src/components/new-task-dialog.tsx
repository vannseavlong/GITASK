import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Column } from "gitask-core";
import type { Host } from "@/host/index.ts";
import { Field, DueField, TIERS } from "@/components/edit-dialogs.tsx";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Prompt the user for the task fields before creating it, mirroring the edit dialog look. */
export function NewTaskDialog({ host, columns, open, onOpenChange }: { host: Host; columns: readonly Column[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [id, setId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [column, setColumn] = React.useState(columns[0]?.id ?? "1-backlog");
  const [due, setDue] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [claimedBy, setClaimedBy] = React.useState("");
  const [error, setError] = React.useState("");

  const valid = Boolean(id) && ID_RE.test(id);
  const t = title.trim();

  const submit = () => {
    setError("");
    if (!valid) { setError("Use letters, digits, . _ - only, starting with a letter or digit."); return; }
    host.send({ type: "new", column, id, title: t || undefined, due: due || undefined,         tier: (tier || undefined) as "T0" | "T1" | "T2" | "T3" | undefined, owner: owner || undefined, claimedBy: claimedBy || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80" aria-describedby="new-task-desc">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription id="new-task-desc">Create the task in the selected status. Only the task id is required; the rest can be edited later.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Task id" htmlFor="new-task-id">
            <Input id="new-task-id" autoFocus value={id} maxLength={120} aria-invalid={!valid} onChange={(e) => { setId(e.target.value); setError(""); }} />
            {!valid && <span role="status" className="text-xs text-destructive">Use letters, digits, . _ - only, starting with a letter or digit.</span>}
          </Field>
          <Field label="Title" htmlFor="new-task-title">
            <Input id="new-task-title" value={t} maxLength={200} placeholder="Same as the task id" onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date"><DueField value={due} onChange={setDue} /></Field>
            <Field label="Tier">
              <Select value={tier || "__none"} onValueChange={(v) => setTier(v === "__none" ? "" : v)}>
                <SelectTrigger aria-label="Tier" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No tier</SelectItem>
                  {TIERS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Owner" htmlFor="new-task-owner">
            <Input id="new-task-owner" value={owner} maxLength={64} placeholder="person id (e.g. ann-roe)" onChange={(e) => setOwner(e.target.value)} />
          </Field>
          <Field label="Claimed by" htmlFor="new-task-claimed">
            <Input id="new-task-claimed" value={claimedBy} maxLength={120} placeholder="none" onChange={(e) => setClaimedBy(e.target.value)} />
          </Field>
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={!valid}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
