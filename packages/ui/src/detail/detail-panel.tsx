import { AssigneePicker } from "@/components/assignee-picker.tsx";
import * as React from "react";
import type { Task } from "gitask-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { BoardData, Host } from "@/host/index.ts";
import { SubtasksSection } from "@/components/subtasks.tsx";
import { Markdown, type SubtaskBinding } from "./markdown.tsx";

const SHOW_NONE = (v: unknown): string | null => (v === undefined || v === null || v === "" || String(v).toLowerCase() === "none" ? null : String(v));

function findTask(board: BoardData | null, path: string | null): Task | null {
  if (!board || !path) return null;
  for (const c of board.columns) for (const t of c.tasks) if (t.path === path) return t;
  return null;
}
function findById(board: BoardData, id: string): Task | null {
  for (const c of board.columns) for (const t of c.tasks) if (t.id === id || t.id + ".md" === id) return t;
  return null;
}

interface Body { path: string; text: string | null; error: string | null }

export function DetailPanel({ host, board, path, onOpenTask, onClose }: {
  host: Host; board: BoardData | null; path: string | null; onOpenTask: (path: string) => void; onClose: () => void;
}) {
  const task = findTask(board, path);
  const [body, setBody] = React.useState<Body | null>(null);

  // Ask for the text when the panel opens, and again when the board changes (the file may have changed).
  React.useEffect(() => {
    if (path && task) host.send({ type: "readTask", path });
  }, [host, path, board]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => host.onMessage((m) => {
    if (m.type === "taskBody") setBody({ path: m.path, text: typeof m.text === "string" ? m.text : null, error: typeof m.text === "string" ? null : String(m.error ?? "unreadable") });
  }), [host]);
  // A task that disappeared (deleted or moved away from the board) closes the panel.
  React.useEffect(() => { if (path && board && !task) onClose(); }, [path, board, task, onClose]);

  const subtasks = React.useMemo<SubtaskBinding>(() => ({
    find: (line) => {
      const st = task?.subtasks.find((s) => s.line === line);
      return st ? { checked: st.checked, text: st.text } : null;
    },
    toggle: (line) => {
      if (!task) return;
      const index = task.subtasks.findIndex((s) => s.line === line);
      if (index >= 0) host.send({ type: "toggleSubtask", path: task.path, index, line });
    },
  }), [task, host]);

  const text = body && body.path === path ? body : null;
  const total = task?.progress && task.progress.total > 0 ? task.progress : null;
  const fields: [string, string | null][] = task
    ? [
        ["Column", SHOW_NONE(task.column)],
        ["Tier", SHOW_NONE(task.tier)],
        ["Claimed by", SHOW_NONE(task.claimedBy)],
        ["Started / updated", SHOW_NONE(task.fields?.["started / updated"])],
        ["Due", SHOW_NONE(task.due)],
      ]
    : [];

  return (
    <Dialog open={!!task} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        aria-describedby="detail-desc"
        className="left-auto right-0 top-0 h-full max-w-[680px] translate-x-0 translate-y-0 grid-rows-[auto_auto_auto_auto_1fr] gap-0 rounded-none border-y-0 border-r-0 p-0"
      >
        {task && (
          <>
            <div className="px-4 pb-2 pt-3 pr-10">
              <DialogTitle className="break-words">{task.displayId ? `${task.displayId}  ` : ""}{task.title}</DialogTitle>
              <DialogDescription id="detail-desc" className="sr-only">Task details</DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-4 pb-2">
              <Button size="sm" onClick={() => host.send({ type: "open", path: task.path })}>Open file</Button>
              <Button size="sm" variant="secondary" onClick={() => host.send({ type: "deleteTask", path: task.path })}>Delete</Button>
              {total && (
                <div className="flex min-w-36 flex-1 items-center gap-1.5 text-xs" title={`${total.done} of ${total.total} done`}>
                  <Progress value={(100 * total.done) / total.total} className="h-1.5 flex-1" />
                  <span>{total.done}/{total.total} done</span>
                </div>
              )}
            </div>
            <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-1.5 border-b border-border px-4 pb-3 pt-2 text-xs">
              <div><dt className="text-[11px] uppercase opacity-70">Owner</dt><dd className="m-0"><AssigneePicker path={task.path} owner={task.owner} people={board?.people} host={host} /></dd></div>
              {fields.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase opacity-70">{k}</dt><dd className="m-0 break-words">{v}</dd></div>
              ))}
              {task.dependsOn?.length > 0 && (
                <div>
                  <dt className="text-[11px] uppercase opacity-70">Depends on</dt>
                  <dd className="m-0 flex flex-wrap gap-1">
                    {task.dependsOn.map((id) => {
                      const dep = findById(board!, id);
                      return dep ? (
                        <button key={id} type="button" className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring" onClick={() => onOpenTask(dep.path)}><Badge>{id}</Badge></button>
                      ) : (
                        <Badge key={id} className="opacity-50">{id}</Badge>
                      );
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <SubtasksSection task={task} host={host} people={board?.people} />
            <div className="min-h-0 overflow-auto px-4 pb-6 pt-2" tabIndex={-1}>
              {text?.error ? (
                <p className="opacity-75">Cannot show the task text: {text.error}</p>
              ) : text === null || text.text === null ? (
                <p className="opacity-75">Loading...</p>
              ) : text.text.trim() === "" ? (
                <p className="opacity-75">This task has no body.</p>
              ) : (
                <Markdown text={text.text} subtasks={subtasks} />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
