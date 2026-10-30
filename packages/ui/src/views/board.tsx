import * as React from "react";
import { Trash2, Palette } from "lucide-react";
import type { Column, Person, Task } from "gitask-core";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Host } from "@/host/index.ts";
import { AvatarStack, SubtaskRows } from "@/components/subtasks.tsx";
import { involvedPeople, listSubtasks, toggleExpanded } from "@host-src/subtask-logic.ts";
import { ChevronRight } from "lucide-react";
import { Assignee } from "@/components/assignee-avatar.tsx";
import { AssigneePicker } from "@/components/assignee-picker.tsx";
import type { ViewProps } from "./registry.tsx";

const PRESETS = ["#3794ff", "#b180d7", "#cca700", "#d18616", "#89d185", "#e5534b", "#2aa198", "#8b949e"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function ColorPicker({ col, host }: { col: Column; host: Host }) {
  const [open, setOpen] = React.useState(false);
  const [hex, setHex] = React.useState(col.color ?? "");
  const [err, setErr] = React.useState("");
  const send = (color: string | null) => host.send({ type: "setColumnColor", column: col.id, color });
  const submit = () => (HEX.test(hex.trim()) ? (setErr(""), send(hex.trim())) : setErr("Use #rrggbb"));
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setHex(col.color ?? ""); setErr(""); } }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Set colour for ${col.label}`}
              className="grid size-4 place-items-center rounded-full border border-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              style={{ background: col.color ?? "transparent" }}
            >
              {!col.color && <Palette className="size-2.5 opacity-60" />}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Set colour for {col.label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 space-y-2">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button key={p} type="button" title={p} aria-label={`Use ${p}`} onClick={() => send(p)} className="size-5 rounded-full border border-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring" style={{ background: p }} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Input value={hex} maxLength={7} placeholder="#rrggbb" aria-label={`Hex colour for ${col.label}`} className="w-20" onChange={(e) => setHex(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())} />
          <Button size="sm" onClick={submit}>Set</Button>
          <Button size="sm" variant="secondary" onClick={() => send(null)}>Reset</Button>
        </div>
        {err && <div role="status" className="text-xs text-destructive">{err}</div>}
      </PopoverContent>
    </Popover>
  );
}

function TaskCard({ t, color, host, people, expanded, onToggle, openTask, onDragStart, onDragEnd }: { t: Task; color?: string; host: Host; people?: readonly Person[]; expanded: boolean; onToggle: () => void; openTask: (path: string) => void; onDragStart: () => void; onDragEnd: () => void }) {
  const open = () => openTask(t.path);
  const [dragging, setDragging] = React.useState(false);
  const pct = t.progress && t.progress.total > 0 ? Math.round((100 * t.progress.done) / t.progress.total) : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-testid="card"
      className={cn("mb-1.5 cursor-grab rounded-md border border-border bg-card p-2 text-card-foreground outline-none hover:border-ring focus-visible:ring-1 focus-visible:ring-ring", dragging && "opacity-40")}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      onClick={open}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}
      onDragStart={(e) => { setDragging(true); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.path); onDragStart(); }}
      onDragEnd={() => { setDragging(false); onDragEnd(); }}
    >
      <div className="mb-0.5 flex items-center justify-between gap-1.5">
        {t.displayId ? <span className="font-mono text-[11px] opacity-70">{t.displayId}</span> : <span />}
        <button
          type="button"
          draggable={false}
          title="Delete task"
          aria-label={`Delete task ${t.id}`}
          className="rounded-sm p-0.5 opacity-50 outline-none hover:text-destructive hover:opacity-100 focus-visible:text-destructive focus-visible:opacity-100"
          onClick={(e) => { e.stopPropagation(); host.send({ type: "deleteTask", path: t.path }); }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="break-words text-[13px]">{t.title}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
        {t.prefix && <Badge>{t.prefix}</Badge>}
        {t.tier && <Badge variant={t.tier === "T3" ? "destructive" : "default"}>{t.tier}</Badge>}
        {involvedPeople(t).length > 1 && <AvatarStack task={t} people={people} />}
        <AssigneePicker path={t.path} owner={t.owner} people={people} host={host}>
          {t.owner ? <Assignee owner={t.owner} people={people} /> : <span className="opacity-60">+ Assign</span>}
        </AssigneePicker>
        {t.claimedBy && t.claimedBy.toLowerCase() !== "none" && <Badge>claimed: {t.claimedBy}</Badge>}
      </div>
      {t.progress && t.progress.total > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" title={`${t.progress.done} of ${t.progress.total} done`}>
          <span className="block h-1 flex-1 overflow-hidden rounded-sm bg-border">
            <span className="block h-full bg-progress" style={{ width: `${pct}%` }} />
          </span>
          <span>{t.progress.done}/{t.progress.total}</span>
        </div>
      )}
      {listSubtasks(t).length > 0 && (
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            draggable={false}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} ${listSubtasks(t).length} sub-tasks of ${t.title}`}
            className="inline-flex items-center gap-0.5 rounded-sm text-[11px] opacity-80 outline-none hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring"
            onClick={onToggle}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
            Sub-tasks
          </button>
          {expanded && <div className="mt-1"><SubtaskRows task={t} host={host} people={people} /></div>}
        </div>
      )}
    </div>
  );
}

export function BoardView({ board, full, host, ui, update, openTask }: ViewProps) {
  const openCards = ui.board?.expanded ?? [];
  const dragging = React.useRef<Task | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  // A status is only deletable when it has no tasks at all, not merely none that pass the filters.
  const total = new Map(full.columns.map((c) => [c.id, c.tasks.length]));
  return (
    <div className="p-3">
      <div className="mb-3">
        <Button size="sm" onClick={() => host.send({ type: "new" })}>+ New task</Button>
      </div>
      <div role="list" className="flex items-start gap-2.5 overflow-x-auto">
        {board.columns.map((col) => (
          <section
            key={col.id}
            role="listitem"
            aria-label={col.label}
            className={cn("min-w-52 flex-1 basis-52 rounded-md border border-border bg-sidebar p-2", over === col.id && "outline-2 outline-dashed outline-ring")}
            onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const t = dragging.current;
              if (t && t.column !== col.id) host.send({ type: "move", path: t.path, to: col.id });
            }}
          >
            <h3
              className="mb-2 flex items-center justify-between gap-2 text-xs uppercase opacity-90"
              style={col.color ? { borderBottom: `3px solid ${col.color}`, paddingBottom: 4 } : undefined}
            >
              <span style={col.color ? { borderLeft: `10px solid ${col.color}`, paddingLeft: 6 } : undefined}>{col.label}</span>
              <span className="ml-auto flex items-center gap-2">
                <ColorPicker col={col} host={host} />
                <span>{col.tasks.length}</span>
              </span>
            </h3>
            {col.tasks.length === 0 && <div className="p-1 text-xs opacity-50">empty</div>}
            {(total.get(col.id) ?? 0) === 0 && (
              <Button size="sm" variant="secondary" className="mb-1.5 text-[11px]" onClick={() => host.send({ type: "deleteColumn", column: col.id })}>
                Delete status
              </Button>
            )}
            {col.tasks.map((t) => (
              <TaskCard key={t.path} t={t} color={col.color} host={host} people={full.people} expanded={openCards.includes(t.path)} onToggle={() => update({ board: { ...ui.board, expanded: toggleExpanded(openCards, t.path) } })} openTask={openTask} onDragStart={() => (dragging.current = t)} onDragEnd={() => (dragging.current = null)} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
