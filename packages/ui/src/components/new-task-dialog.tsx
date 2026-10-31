import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Column, Person } from "gitask-core";
import type { Host } from "@/host/index.ts";
import { Field, DueField, TIERS } from "@/components/edit-dialogs.tsx";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const slug = (title: string) => title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Create a task from a filled-in form: title, description, start & due date, tier, status and member. */
export function NewTaskDialog({
  host,
  columns,
  people,
  open,
  onOpenChange,
}: {
  host: Host;
  columns: readonly Column[];
  people?: readonly Person[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [start, setStart] = React.useState("");
  const [due, setDue] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [column, setColumn] = React.useState(columns[0]?.id ?? "1-backlog");
  const [member, setMember] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // A fresh form every time: the previous task's values must not carry over.
    setTitle(""); setDescription(""); setStart(""); setDue(""); setTier(""); setMember("");
    setColumn(columns[0]?.id ?? "1-backlog");
    setSubmitted(false); setSubmitting(false); setError("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const id = slug(title);
  const valid = Boolean(title) && ID_RE.test(id);

  const submit = async () => {
    setSubmitted(true);
    setError("");
    if (!valid) { setError("Enter a title."); return; }
    setSubmitting(true);
    host.send({ type: "new", column, id, title, description, start: start || undefined, due: due || undefined, tier: (tier || undefined) as "T0" | "T1" | "T2" | "T3" | undefined, owner: member || undefined });
    // The server creates the task and pushes a fresh board; close once the request is dispatched.
    await new Promise((r) => setTimeout(r, 400));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80" aria-describedby="new-task-desc">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription id="new-task-desc">Create the task in the selected status. Title is required; everything else can be edited later.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Title" htmlFor="new-task-title">
            <Input id="new-task-title" autoFocus value={title} maxLength={200} aria-invalid={submitted && !valid} onChange={(e) => { setTitle(e.target.value); setError(""); }} />
            {submitted && !valid && <span role="status" className="text-xs text-destructive">Enter a title (letters, digits, spaces, . _ -).</span>}
          </Field>
          <Field label="Description" htmlFor="new-task-desc-input">
            <textarea id="new-task-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} className="h-24 rounded-md border border-border bg-input px-3 py-2 text-sm text-input-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><DueField value={start} onChange={setStart} /></Field>
            <Field label="Due date"><DueField value={due} onChange={setDue} /></Field>
          </div>
          <Field label="Tier">
            <Select value={tier || "__none"} onValueChange={(v) => setTier(v === "__none" ? "" : v)}>
              <SelectTrigger aria-label="Tier" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No tier</SelectItem>
                {TIERS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={column} onValueChange={setColumn}>
              <SelectTrigger aria-label="Status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Member (assignee)">
            <Select value={member || "__none"} onValueChange={(v) => setMember(v === "__none" ? "" : v)}>
              <SelectTrigger aria-label="Member" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {(people ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!valid || submitting}>{submitting ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
