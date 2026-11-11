import * as React from "react";
import { Plus, Minus, Search } from "lucide-react";
import type { Task } from "gitask-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewTaskDialog } from "@/components/new-task-dialog.tsx";
import { SprintDialog } from "@/components/sprint-dialog.tsx";
import { CompleteSprintDialog } from "@/components/complete-sprint-dialog.tsx";
import { cn } from "@/lib/utils";
import type { Host } from "@/host/index.ts";
import { derive, matchesText } from "@/shell/logic.ts";
import { estimateUnit, localToday, sprintLabel, sprintRange, sprintTime } from "@host-src/sprint-scope.ts";
import { TASK_DRAG_TYPE, capacityOf, parseEstimateInput, pickPlanSprint, plannable, startBlocker, type PlanSprint } from "@/lib/sprint-plan.ts";
import type { ViewProps } from "./registry.tsx";

/** Inline estimate: Enter or leaving the field saves, Escape puts the old value back, empty removes it. */
function EstimateInput({ task, host, unit, disabled }: { task: Task; host: Host; unit: string; disabled?: boolean }) {
  const saved = task.estimate === undefined ? "" : String(task.estimate);
  const [text, setText] = React.useState(saved);
  const [error, setError] = React.useState("");
  React.useEffect(() => { setText(saved); setError(""); }, [saved]);
  const commit = () => {
    const r = parseEstimateInput(text);
    if (!r.ok) return setError(r.error);
    setError("");
    if (r.value !== (task.estimate ?? null)) host.send({ type: "setEstimate", path: task.path, value: r.value });
  };
  return (
    <span className="inline-flex items-center gap-1" title={error || `Estimate (${unit})`}>
      <Input
        value={text}
        inputMode="decimal"
        disabled={disabled}
        aria-label={`Estimate for ${task.title}, ${unit}`}
        aria-invalid={Boolean(error)}
        placeholder="–"
        className={cn("h-6 w-14 px-1.5 text-right text-xs", error && "border-destructive")}
        onChange={(e) => { setText(e.target.value); setError(""); }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); setText(saved); setError(""); }
        }}
      />
      <span className="text-[11px] opacity-70">{unit}</span>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </span>
  );
}

function TaskRow({ task, status, host, unit, action, actionLabel, onAction, canEdit, openTask }: {
  task: Task; status: string; host: Host; unit?: string; action: "add" | "remove"; actionLabel: string; onAction?: () => void; canEdit: boolean; openTask: (path: string) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  return (
    <li
      draggable={canEdit && Boolean(onAction)}
      data-testid={`sprint-row-${action}`}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-card px-2 py-1.5 text-card-foreground", canEdit && onAction && "cursor-grab", dragging && "opacity-40")}
      onDragStart={(e) => { setDragging(true); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData(TASK_DRAG_TYPE, task.path); }}
      onDragEnd={() => setDragging(false)}
    >
      <button type="button" className="min-w-0 flex-1 basis-40 rounded-sm text-left outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring" onClick={() => openTask(task.path)}>
        {task.displayId && <span className="mr-1.5 font-mono text-[11px] opacity-70">{task.displayId}</span>}
        <span className="break-words text-[13px]">{task.title}</span>
      </button>
      <Badge variant="outline" className="text-[11px]">{status}</Badge>
      {unit && <EstimateInput task={task} host={host} unit={unit} disabled={!canEdit} />}
      {onAction && (
        <Button type="button" size="sm" variant="outline" className="h-6 px-1.5 text-xs" disabled={!canEdit} aria-label={actionLabel} title={actionLabel} onClick={onAction}>
          {action === "add" ? <Plus /> : <Minus />}{action === "add" ? "Add" : "Remove"}
        </Button>
      )}
    </li>
  );
}

/** A pane that accepts a dragged task row from the other pane. */
function DropPane({ label, onDropPath, enabled, children, className }: { label: string; onDropPath: (path: string) => void; enabled: boolean; children: React.ReactNode; className?: string }) {
  const [over, setOver] = React.useState(false);
  return (
    <section
      aria-label={label}
      className={cn("min-w-0 rounded-md border border-border bg-sidebar p-2", over && "outline-2 outline-dashed outline-ring", className)}
      onDragOver={(e) => { if (enabled && e.dataTransfer.types.includes(TASK_DRAG_TYPE)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const path = e.dataTransfer.getData(TASK_DRAG_TYPE);
        if (enabled && path) { e.preventDefault(); onDropPath(path); }
      }}
    >
      {children}
    </section>
  );
}

export function SprintView({ full, host, ui, update, openTask }: ViewProps) {
  const sprints = full.sprints;
  const [q, setQ] = React.useState("");
  const [dialog, setDialog] = React.useState<"new" | "edit" | null>(null);
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);
  const [startError, setStartError] = React.useState("");
  const [starting, setStarting] = React.useState(false);
  const [completing, setCompleting] = React.useState<string | null>(null); // sprint id while the Complete dialog is open

  // The switcher's scope picks the sprint; the backlog ignores it (it is always the backlog) but keeps the other filters.
  const d = React.useMemo(() => derive(full, ui), [full, ui]);
  const target = pickPlanSprint(d.scope.kind === "sprint" ? d.scope.sprint : undefined, sprints);
  const backlogBoard = React.useMemo(() => derive(full, { ...ui, sprintScope: "backlog" }).shown, [full, ui]);

  React.useEffect(() => host.onMessage((m) => {
    if (m.type === "sprintSaved" && m.action === "start") {
      setStarting(false);
      setStartError(m.ok ? "" : m.error ?? "Could not start the sprint.");
    }
  }), [host]);
  React.useEffect(() => { setStartError(""); }, [target?.id]);

  if (!sprints) return <div className="p-6 text-muted-foreground" role="status">Sprints are off. Add a "sprint" block to Tasks/gitask.json to plan sprints.</div>;

  const cfg = sprints.config;
  const unit = estimateUnit(cfg.estimate);
  const label = new Map(full.columns.map((c) => [c.id, c.label]));
  const editable = Boolean(target && target.state !== "closed");
  const choices = plannable(sprints);
  if (target && !choices.some((s) => s.id === target.id)) choices.push(target); // a closed sprint picked in the switcher
  const nextNumber = Math.max(0, ...sprints.list.map((s) => Number(s.id.slice(1)))) + 1;

  const backlog = (backlogBoard?.columns ?? []).flatMap((c) => c.tasks).filter((t) => matchesText(t, q));
  const inSprint = target ? full.columns.flatMap((c) => c.tasks).filter((t) => t.sprint === target.id) : [];
  const cap = target && unit ? capacityOf(inSprint.map((t) => t.estimate), target.capacity, unit) : undefined;
  const today = localToday();
  const blocker = target ? startBlocker(target, sprints) : undefined;

  const setSprint = (path: string, sprint: string | null) => host.send({ type: "setTaskSprint", path, sprint });
  const pick = (id: string) => update({ sprintScope: id === sprints.active ? "active" : id });
  const start = () => { if (!target) return; setStartError(""); setStarting(true); host.send({ type: "startSprint", id: target.id }); };

  return (
    <div className="p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {choices.length > 0 && (
          <Select value={target?.id ?? ""} onValueChange={pick}>
            <SelectTrigger aria-label="Sprint to plan" className="h-8 max-w-64 text-xs [&>span]:truncate"><SelectValue placeholder="Pick a sprint" /></SelectTrigger>
            <SelectContent>
              {choices.map((s) => <SelectItem key={s.id} value={s.id}>{sprintLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" onClick={() => setDialog("new")}>+ New sprint</Button>
        {target && <Button size="sm" variant="secondary" disabled={!editable} onClick={() => setDialog("edit")}>Edit sprint</Button>}
        {target?.state === "planned" && (
          <Button size="sm" variant="secondary" disabled={Boolean(blocker) || starting} aria-describedby={blocker ? "sprint-start-why" : undefined} onClick={start}>
            {starting ? "Starting…" : "Start sprint"}
          </Button>
        )}
        {target && editable && <Button size="sm" variant="secondary" onClick={() => setNewTaskOpen(true)}>+ New task in {target.id}</Button>}
        {target?.state === "active" && (
          <Button size="sm" variant={sprintTime(target, today).warn ? "default" : "secondary"} onClick={() => setCompleting(target.id)}>Complete sprint</Button>
        )}
      </div>
      {target?.state === "planned" && blocker && <p id="sprint-start-why" role="note" className="mb-2 text-xs text-muted-foreground">Cannot start {target.id}: {blocker}</p>}
      {startError && <p role="alert" className="mb-2 text-xs text-destructive">{startError}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <DropPane label="Backlog" enabled={editable} onDropPath={(p) => { if (inSprint.some((t) => t.path === p)) setSprint(p, null); }}>
          <h3 className="mb-2 flex items-center justify-between gap-2 text-xs uppercase opacity-90">
            <span>Backlog</span><span>{backlog.length}</span>
          </h3>
          <label className="mb-2 flex items-center gap-1.5">
            <Search className="size-3.5 opacity-60" aria-hidden />
            <Input value={q} placeholder="Search the backlog" aria-label="Search the backlog" className="h-7 text-xs" onChange={(e) => setQ(e.target.value)} />
          </label>
          {backlog.length === 0 ? (
            <p role="status" className="p-2 text-xs text-muted-foreground">{q ? "No backlog task matches the search." : "Backlog is empty. Every open task is in a sprint, or the filters hide them."}</p>
          ) : (
            <ul className="grid gap-1.5">
              {backlog.map((t) => (
                <TaskRow key={t.path} task={t} status={label.get(t.column) ?? t.column} host={host} unit={unit} action="add" canEdit={editable}
                  actionLabel={target ? `Add ${t.title} to ${target.id}` : "Add to sprint"} onAction={target ? () => setSprint(t.path, target.id) : undefined} openTask={openTask} />
              ))}
            </ul>
          )}
        </DropPane>

        <DropPane label={target ? `Tasks in ${target.id}` : "Sprint"} enabled={editable} onDropPath={(p) => { if (target && !inSprint.some((t) => t.path === p)) setSprint(p, target.id); }}>
          {!target ? (
            <div role="status" className="grid justify-items-start gap-2 p-2 text-xs text-muted-foreground">
              <p>{sprints.list.length === 0 ? "No sprints yet. Plan the first one: create a sprint, then add tasks from the backlog." : "No planned or active sprint. Create the next one."}</p>
              <Button size="sm" onClick={() => setDialog("new")}>+ New sprint</Button>
            </div>
          ) : (
            <>
              <h3 className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
                <span className="font-semibold uppercase opacity-90">{target.id} · {target.name} <span className="font-normal normal-case opacity-70">({target.state})</span></span>
                <span className="opacity-80">{[sprintRange(target, today), sprintTime(target, today).text].filter(Boolean).join(" · ")}</span>
              </h3>
              {target.goal && <p className="mb-2 break-words text-xs opacity-90">{target.goal}</p>}
              {target.state === "closed" && <p role="note" className="mb-2 text-xs text-muted-foreground">{target.id} is closed and read-only. Pick a planned or active sprint to plan.</p>}
              {cap && (
                <div className="mb-2">
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span>Capacity</span>
                    <span className={cn(cap.over && "font-semibold text-destructive")}>{cap.text}</span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`Capacity of ${target.id}`}
                    aria-valuemin={0}
                    aria-valuemax={cap.capacity ?? 0}
                    aria-valuenow={cap.points}
                    aria-valuetext={cap.text}
                    className="h-1.5 overflow-hidden rounded-sm bg-border"
                  >
                    <span className={cn("block h-full", cap.over ? "bg-destructive" : "bg-progress")} style={{ width: `${cap.pct}%` }} />
                  </div>
                  {cap.over && <p role="alert" className="mt-1 text-[11px] text-destructive">Over capacity: remove tasks or raise the capacity.</p>}
                </div>
              )}
              <p className="mb-2 text-[11px] opacity-80">{inSprint.length} task{inSprint.length === 1 ? "" : "s"}</p>
              {inSprint.length === 0 ? (
                <p role="status" className="p-2 text-xs text-muted-foreground">{editable ? "Add tasks from the backlog: use Add or drag a task here." : "No tasks."}</p>
              ) : (
                <ul className="grid gap-1.5">
                  {inSprint.map((t) => (
                    <TaskRow key={t.path} task={t} status={label.get(t.column) ?? t.column} host={host} unit={unit} action="remove" canEdit={editable}
                      actionLabel={`Remove ${t.title} from ${target.id}`} onAction={() => setSprint(t.path, null)} openTask={openTask} />
                  ))}
                </ul>
              )}
            </>
          )}
        </DropPane>
      </div>

      <SprintDialog
        host={host}
        sprint={dialog === "edit" ? target : undefined}
        nextName={`Sprint ${nextNumber}`}
        unit={unit}
        lengthDays={cfg.lengthDays}
        open={dialog !== null}
        onOpenChange={(o) => { if (!o) setDialog(null); }}
        onSaved={(id) => pick(id)}
      />
      {completing && (
        <CompleteSprintDialog
          host={host}
          board={full}
          sprintId={completing}
          open
          onOpenChange={(o) => { if (!o) setCompleting(null); }}
          onPlanNext={(next) => update({ sprintScope: next ?? "all" })}
        />
      )}
      <NewTaskDialog host={host} columns={full.columns} people={full.people} sprints={sprints} defaultSprint={editable ? target?.id : undefined} open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </div>
  );
}
