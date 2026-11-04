import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Column } from "gitask-core";
import type { Host } from "@/host/index.ts";
import { Field } from "@/components/edit-dialogs.tsx";

const MAX_NAME = 40;
const HEX = /^#[0-9a-fA-F]{6}$/;
const REPLY_TIMEOUT_MS = 10000;

/**
 * Add a status column: name, optional colour, optional position. The host validates again (one shared function in
 * core) and answers `columnAdded`; the dialog closes on success and stays open with the message on failure.
 */
export function AddStatusDialog({ host, columns, open, onOpenChange }: { host: Host; columns: readonly Column[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("");
  const [after, setAfter] = React.useState("__end");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const unsub = React.useRef<(() => void) | undefined>(undefined);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => { unsub.current?.(); unsub.current = undefined; clearTimeout(timer.current); };
  React.useEffect(() => {
    if (open) { setName(""); setColor(""); setAfter("__end"); setError(""); setSaving(false); }
    return stop;
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name for the status.");
    if (trimmed.length > MAX_NAME) return setError(`Use at most ${MAX_NAME} characters.`);
    if (color.trim() && !HEX.test(color.trim())) return setError("Colour must be #rrggbb.");
    setError("");
    setSaving(true);
    stop();
    timer.current = setTimeout(() => { stop(); setSaving(false); setError("The host did not answer. Check that it is still running and try again."); }, REPLY_TIMEOUT_MS);
    unsub.current = host.onMessage((m) => {
      const r = m as { type: string; ok?: boolean; error?: string; message?: string };
      // Only this request's answers: `columnAdded`, or the host's "Rejected: ..." for a message it refused. Other errors are not ours.
      if (r.type !== "columnAdded" && !(r.type === "error" && r.message?.startsWith("Rejected: "))) return;
      stop();
      setSaving(false);
      if (r.type === "columnAdded" && r.ok) onOpenChange(false);
      else setError((r.type === "error" ? r.message?.replace(/^Rejected: /, "") : r.error) ?? "Could not add the status.");
    });
    host.send({ type: "addColumn", name: trimmed, ...(after !== "__end" ? { after } : {}), ...(color.trim() ? { color: color.trim() } : {}) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80" aria-describedby="add-status-desc">
        <DialogHeader>
          <DialogTitle>Add status</DialogTitle>
          <DialogDescription id="add-status-desc">Creates a new column as the next numbered folder in Tasks/. Letters, digits, spaces and hyphens only.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Name" htmlFor="add-status-name">
            <Input id="add-status-name" autoFocus value={name} maxLength={MAX_NAME} aria-invalid={Boolean(error)} onChange={(e) => { setName(e.target.value); setError(""); }} />
          </Field>
          <Field label="Colour (optional)" htmlFor="add-status-color">
            <Input id="add-status-color" value={color} maxLength={7} placeholder="#rrggbb" onChange={(e) => { setColor(e.target.value); setError(""); }} />
          </Field>
          <Field label="Position">
            <Select value={after} onValueChange={setAfter}>
              <SelectTrigger aria-label="Position" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__end">At the end</SelectItem>
                {columns.map((c) => <SelectItem key={c.id} value={c.id}>After {c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? "Adding…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
