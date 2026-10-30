import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Column } from "gitask-core";
import type { Host } from "@/host/index.ts";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Prompt the user for a task id (the H1 title) before creating it, instead of creating one blindly. */
export function NewTaskDialog({ host, columns, open, onOpenChange }: { host: Host; columns: readonly Column[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [id, setId] = React.useState("");
  const [column, setColumn] = React.useState(columns[0]?.id ?? "1-backlog");
  const [error, setError] = React.useState("");
  const valid = Boolean(id) && ID_RE.test(id);

  const submit = () => {
    setError("");
    if (!valid) { setError("Use letters, digits, . _ - only, starting with a letter or digit."); return; }
    host.send({ type: "new", column, id });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80" aria-describedby="new-task-desc">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription id="new-task-desc">Enter the task id (it becomes the task title). It will be created in the selected status.</DialogDescription>
        </DialogHeader>
        <Input id="new-task-id" autoFocus value={id} placeholder="e.g. Web-login-page" onChange={(e) => { setId(e.target.value); setError(""); }} className="mb-2" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Select value={column} onValueChange={setColumn}>
            <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {error && <div role="alert" className="mb-2 text-xs text-destructive">{error}</div>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
