import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import type { Subtask, Task } from "gitask-core";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDay, parseDay } from "@/components/ui/date-range-picker.tsx";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssigneePicker } from "@/components/assignee-picker.tsx";
import { SubtaskAssignee, SubtaskLane } from "@/components/subtasks.tsx";
import type { BoardData, Host } from "@/host/index.ts";
import { closeEdit, pendingEdit, subscribeEdit } from "@/lib/edit-flow.ts";
import type { EditRequest } from "@/lib/edit-flow.ts";

const NONE = "__none";
export const TIERS = ["T0", "T1", "T2", "T3"] as const;
const oneLine = (v: string) => v.replace(/[\r\n\u2028\u2029]+/g, " ");

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className="text-[11px] uppercase opacity-70">{label}</label>
      {children}
    </div>
  );
}

export { Field };

function DueField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label="Due date" className="font-normal"><CalendarIcon />{value || "No due date"}</Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Calendar mode="single" defaultMonth={parseDay(value)} selected={parseDay(value)} onSelect={(d) => { onChange(d ? formatDay(d) : ""); setOpen(false); }} />
        </PopoverContent>
      </Popover>
      {value && <Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Clear due date" onClick={() => onChange("")}><X /></Button>}
    </div>
  );
}

export { DueField };

function EditTaskForm({ task, host, people }: { task: Task; host: Host; people: BoardData["people"] }) {
  const [title, setTitle] = React.useState(task.title);
  const [due, setDue] = React.useState(task.due ?? "");
  const [tier, setTier] = React.useState(task.tier ?? "");
  const [claimed, setClaimed] = React.useState(task.claimedBy ?? "");
  const t = title.trim();
  const save = () => {
    if (!t) return;
    const patch: { title?: string; due?: string | null; tier?: (typeof TIERS)[number] | null; claimedBy?: string | null } = {};
    if (t !== task.title) patch.title = t;
    if (due !== (task.due ?? "")) patch.due = due || null;
    if (tier !== (task.tier ?? "")) patch.tier = (tier || null) as (typeof TIERS)[number] | null;
    if (claimed.trim() !== (task.claimedBy ?? "")) patch.claimedBy = claimed.trim() || null;
    if (Object.keys(patch).length) host.send({ type: "editTask", path: task.path, patch });
    closeEdit();
  };
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Field label="Title" htmlFor="edit-title">
        <Input id="edit-title" autoFocus value={title} maxLength={200} aria-invalid={!t} onChange={(e) => setTitle(oneLine(e.target.value))} />
        {!t && <span role="status" className="text-xs text-destructive">A title is required.</span>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date"><DueField value={due} onChange={setDue} /></Field>
        <Field label="Tier">
          <Select value={tier || NONE} onValueChange={(v) => setTier(v === NONE ? "" : v)}>
            <SelectTrigger aria-label="Tier" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No tier</SelectItem>
              {TIERS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Owner (applies right away)"><span><AssigneePicker path={task.path} owner={task.owner} people={people} host={host} /></span></Field>
      <Field label="Claimed by" htmlFor="edit-claimed">
        <Input id="edit-claimed" value={claimed} maxLength={120} placeholder="none" onChange={(e) => setClaimed(oneLine(e.target.value))} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={closeEdit}>Cancel</Button>
        <Button type="submit" disabled={!t}>Save</Button>
      </DialogFooter>
    </form>
  );
}

function EditSubtaskForm({ task, sub, index, host, people }: { task: Task; sub: Subtask; index: number; host: Host; people: BoardData["people"] }) {
  const [text, setText] = React.useState(sub.text);
  const [assignee, setAssignee] = React.useState<string | null>(sub.assignee ?? null);
  const [lane, setLane] = React.useState<string | null>(sub.lane ?? null);
  const t = text.trim();
  const save = () => {
    if (!t) return;
    const m: { text?: string; assignee?: string | null; lane?: string | null } = {};
    if (t !== sub.text) m.text = t;
    if (assignee !== (sub.assignee ?? null)) m.assignee = assignee;
    if (lane !== (sub.lane ?? null)) m.lane = lane;
    if (Object.keys(m).length) host.send({ type: "editSubtask", path: task.path, index, line: sub.line, ...m });
    closeEdit();
  };
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Field label="Text" htmlFor="edit-sub-text">
        <Input id="edit-sub-text" autoFocus value={text} maxLength={200} aria-invalid={!t} onChange={(e) => setText(oneLine(e.target.value))} />
        {!t && <span role="status" className="text-xs text-destructive">Text is required.</span>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignee"><SubtaskAssignee value={assignee ?? undefined} people={people} label="Assignee" onChange={setAssignee} /></Field>
        <Field label="Lane"><SubtaskLane value={lane ?? undefined} label="Lane" onChange={setLane} /></Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={closeEdit}>Cancel</Button>
        <Button type="submit" disabled={!t}>Save</Button>
      </DialogFooter>
    </form>
  );
}

/** The one edit dialog (task or sub-task). It reads the live task from the board, so it closes if the task is gone. */
export function EditDialogs({ host, board }: { host: Host; board: BoardData | null }) {
  const req = React.useSyncExternalStore(subscribeEdit, pendingEdit, pendingEdit);
  const task = req && board ? board.columns.flatMap((c) => c.tasks).find((x) => x.path === req.path) : undefined;
  const sub = req?.kind === "subtask" ? task?.subtasks[req.index] : undefined;
  const valid = !!req && !!task && (req.kind === "task" || (!!sub && sub.line === req.line));
  React.useEffect(() => { if (req && board && !valid) closeEdit(); }, [req, board, valid]);
  const key = req ? (req.kind === "task" ? req.path : `${req.path}:${req.index}:${req.line}`) : "";
  return (
    <Dialog open={valid} onOpenChange={(o) => { if (!o) closeEdit(); }}>
      <DialogContent aria-describedby="edit-desc">
        {valid && task && req && (
          <>
            <DialogHeader>
              <DialogTitle>{req.kind === "task" ? `Edit task ${task.displayId ?? task.id}` : "Edit sub-task"}</DialogTitle>
              <DialogDescription id="edit-desc">{req.kind === "task" ? "Only the title and these header lines of the file change." : `In ${task.title}. Only this checkbox line changes.`}</DialogDescription>
            </DialogHeader>
            {req.kind === "task" ? <EditTaskForm key={key} task={task} host={host} people={board?.people} /> : <EditSubtaskForm key={key} task={task} sub={sub!} index={(req as Extract<EditRequest, { kind: "subtask" }>).index} host={host} people={board?.people} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
