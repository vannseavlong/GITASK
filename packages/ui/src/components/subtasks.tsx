import * as React from "react";
import type { Person, Task } from "gitask-core";
import { isSubSection, involvedPeople, listSubtasks, SPLIT_TEMPLATE } from "@host-src/subtask-logic.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Host } from "@/host/index.ts";

export { isSubSection };
const NONE = "__none";
const LANE_LABEL: Record<string, string> = { backend: "Backend", uxui: "UX/UI", frontend: "Frontend" };
export const laneLabel = (lane: string) => LANE_LABEL[lane.toLowerCase()] ?? lane;
const nameOf = (people: readonly Person[] | undefined, id: string) => people?.find((p) => p.id.toLowerCase() === id.toLowerCase())?.name ?? id;

/** One small avatar for a person id (initials; the name is the tooltip). */
export function PersonAvatar({ id, people, className }: { id: string; people?: readonly Person[]; className?: string }) {
  const name = nameOf(people, id);
  return (
    <Avatar className={cn("size-4", className)} title={name}>
      <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
}

/** Stacked avatars of everyone on a task (owner and sub-task assignees), at most `max` plus a +n. */
export function AvatarStack({ task, people, max = 3 }: { task: Pick<Task, "owner" | "subtasks">; people?: readonly Person[]; max?: number }) {
  const ids = involvedPeople(task);
  if (ids.length === 0) return null;
  return (
    <span className="inline-flex items-center -space-x-1" role="img" aria-label={`People: ${ids.map((i) => nameOf(people, i)).join(", ")}`} data-testid="avatar-stack">
      {ids.slice(0, max).map((id) => <PersonAvatar key={id} id={id} people={people} className="size-5 border border-card" />)}
      {ids.length > max && <span className="pl-2 text-[10px] opacity-80">+{ids.length - max}</span>}
    </span>
  );
}

export function LaneBadge({ lane }: { lane?: string }) {
  return lane ? <Badge data-testid="lane-badge">{laneLabel(lane)}</Badge> : null;
}

/** Small select of people for a sub-task. A current assignee who is not in the people list stays selectable. */
export function SubtaskAssignee({ value, people, onChange, label }: { value?: string; people?: readonly Person[]; onChange: (id: string | null) => void; label: string }) {
  const ids = (people ?? []).map((p) => p.id);
  if (value && !ids.some((i) => i.toLowerCase() === value.toLowerCase())) ids.push(value);
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger aria-label={label} className="h-7 min-w-24 text-xs" onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {ids.map((id) => <SelectItem key={id} value={id}>{nameOf(people, id)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SubtaskLane({ value, onChange, label }: { value?: string; onChange: (lane: string | null) => void; label: string }) {
  const lanes = Object.keys(LANE_LABEL);
  if (value && !lanes.includes(value.toLowerCase())) lanes.push(value);
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger aria-label={label} className="h-7 min-w-24 text-xs" onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No lane</SelectItem>
        {lanes.map((l) => <SelectItem key={l} value={l}>{laneLabel(l)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Read-only-ish rows: tick, text, assignee avatar, lane badge. Used by the List and the Board card. */
export function SubtaskRows({ task, host, people }: { task: Task; host: Host; people?: readonly Person[] }) {
  const rows = listSubtasks(task);
  if (rows.length === 0) return null;
  return (
    <ul className="m-0 list-none space-y-1 p-0" aria-label={`Sub-tasks of ${task.title}`} data-testid="subtask-rows">
      {rows.map(({ sub, index }) => (
        <li key={sub.line} className="flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            className="size-3.5 shrink-0 accent-[var(--color-primary)]"
            checked={sub.checked}
            aria-label={`${sub.checked ? "Untick" : "Tick"} ${sub.text}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={() => host.send({ type: "toggleSubtask", path: task.path, index, line: sub.line })}
          />
          <span className={cn("min-w-0 flex-1 break-words", sub.checked && "line-through opacity-60")}>{sub.text}</span>
          {sub.assignee && <PersonAvatar id={sub.assignee} people={people} />}
          <LaneBadge lane={sub.lane} />
        </li>
      ))}
    </ul>
  );
}

/** Detail panel section: add, tick, assign, set lane, plus the split template. */
export function SubtasksSection({ task, host, people }: { task: Task; host: Host; people?: readonly Person[] }) {
  const rows = listSubtasks(task);
  const [text, setText] = React.useState("");
  const add = () => {
    const t = text.trim();
    if (!t) return;
    host.send({ type: "addSubtask", path: task.path, text: t });
    setText("");
  };
  const split = () => {
    const have = new Set(rows.map((r) => r.sub.lane?.toLowerCase()));
    for (const s of SPLIT_TEMPLATE) if (!have.has(s.lane)) host.send({ type: "addSubtask", path: task.path, text: s.text, lane: s.lane });
  };
  return (
    <section className="border-b border-border px-4 py-3" aria-label="Sub-tasks" data-testid="subtasks-section">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="m-0 text-xs font-semibold uppercase opacity-80">Sub-tasks</h3>
        <Button size="sm" variant="secondary" onClick={split} title="Add a sub-task each for backend, UX/UI and frontend">Split into backend / UX/UI / frontend</Button>
      </div>
      {rows.length === 0 && <p className="m-0 mb-2 text-xs opacity-70">No sub-tasks yet.</p>}
      <ul className="m-0 list-none space-y-1.5 p-0">
        {rows.map(({ sub, index }) => (
          <li key={sub.line} className="flex flex-wrap items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--color-primary)]"
              checked={sub.checked}
              aria-label={`${sub.checked ? "Untick" : "Tick"} ${sub.text}`}
              onChange={() => host.send({ type: "toggleSubtask", path: task.path, index, line: sub.line })}
            />
            <span className={cn("min-w-32 flex-1 break-words", sub.checked && "line-through opacity-60")}>{sub.text}</span>
            <SubtaskAssignee value={sub.assignee} people={people} label={`Assignee of ${sub.text}`} onChange={(assignee) => host.send({ type: "setSubtaskAssignee", path: task.path, index, line: sub.line, assignee })} />
            <SubtaskLane value={sub.lane} label={`Lane of ${sub.text}`} onChange={(lane) => host.send({ type: "setSubtaskLane", path: task.path, index, line: sub.line, lane })} />
          </li>
        ))}
      </ul>
      <form className="mt-2 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input value={text} maxLength={200} placeholder="Add a sub-task" aria-label="New sub-task" onChange={(e) => setText(e.target.value.replace(/[\r\n]+/g, " "))} />
        <Button size="sm" type="submit" disabled={!text.trim()}>Add</Button>
      </form>
    </section>
  );
}
