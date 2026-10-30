// Message handling for `gitask serve`: the same WebviewMessage union the VS Code extension handles,
// validated by the same `validateMessage`, applied through gitask-core. No http here, so it is testable alone.
import { basename } from "node:path";
import { addSubtask, assignIds, createTask, deleteColumn, deleteTask, loadBoard, moveTask, readTaskBody, setColumnColor, setSubtaskAssignee, setSubtaskLane, toggleSubtask, validateMessage } from "gitask-core";
import type { HostMessage } from "gitask-core";

export interface HandlerOptions {
  /** Absolute Tasks directory. */
  dir: string;
  /** Commit changes (default true), like the extension's `gitask.autoCommit`. */
  commit?: boolean;
  staleDays?: number;
  /** Owner written into tasks created from the browser. */
  owner?: string;
}

export interface HandlerResult {
  /** HTTP-ish status: 200 handled (even when the operation failed: see `reply`), 400 rejected. */
  status: number;
  /** Direct answer for the sender (`taskBody`, `error`), if any. */
  reply?: HostMessage;
  /** True when files may have changed, so a fresh board should be pushed. */
  changed: boolean;
}

export function createHandler(o: HandlerOptions) {
  const commit = o.commit ?? true;
  let idsAssigned = false;

  async function board() {
    const b = await loadBoard(o.dir);
    return { ...b, settings: { staleDays: o.staleDays ?? 14 } };
  }

  const err = (message: string): HandlerResult => ({ status: 200, reply: { type: "error", message }, changed: true });

  async function handle(raw: unknown): Promise<HandlerResult> {
    let columns: string[];
    try {
      columns = (await loadBoard(o.dir)).columns.map((c) => c.id);
    } catch (e) {
      return { status: 200, reply: { type: "error", message: `Cannot read ${o.dir}: ${(e as Error).message}` }, changed: false };
    }
    // The browser remembers its view itself (localStorage); nothing to do server-side.
    if (typeof raw === "object" && raw !== null && (raw as { type?: unknown }).type === "view") return { status: 200, changed: false };
    const v = validateMessage(raw, { tasksDir: o.dir, columns, views: [] });
    if (!v.ok) return { status: 400, reply: { type: "error", message: `Rejected: ${v.reason}` }, changed: false };
    const m = v.message;
    switch (m.type) {
      case "ready":
        if (!idsAssigned) {
          idsAssigned = true; // backfill task IDs once per server run, like the extension does per board
          try { await assignIds(o.dir, { commit }); } catch { /* not fatal */ }
        }
        return { status: 200, changed: true };
      case "view":
        return { status: 200, changed: false };
      case "open":
        return { status: 200, changed: false }; // a browser cannot open a file in an editor
      case "new":
        try {
          const id = `New-task-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
          await createTask(o.dir, m.column ?? "1-backlog", id, { owner: o.owner });
          return { status: 200, changed: true };
        } catch (e) {
          return err((e as Error).message);
        }
      case "move":
        try {
          await moveTask(o.dir, m.path, m.to, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not move ${basename(m.path)}: ${(e as Error).message}`);
        }
      case "deleteTask":
        try {
          await deleteTask(o.dir, m.path, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not delete ${basename(m.path, ".md")}: ${(e as Error).message}`);
        }
      case "deleteColumn": {
        const col = (await loadBoard(o.dir)).columns.find((c) => c.id === m.column);
        if (col?.tasks.length) return err(`cannot delete status "${col.label}": it still has ${col.tasks.length} task(s). Move or delete them first.`);
        try {
          await deleteColumn(o.dir, m.column, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err((e as Error).message);
        }
      }
      case "readTask": {
        const r = await readTaskBody(m.path, o.dir);
        return { status: 200, reply: { type: "taskBody", path: m.path, ...r }, changed: false };
      }
      case "setColumnColor":
        try {
          await setColumnColor(o.dir, m.column, m.color, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not save the colour: ${(e as Error).message}`);
        }
      case "addSubtask":
      case "setSubtaskAssignee":
      case "setSubtaskLane":
        try {
          const task = (await loadBoard(o.dir)).columns.flatMap((c) => c.tasks).find((t) => t.path === m.path);
          if (!task) throw new Error("task not found");
          if (m.type === "addSubtask") {
            await addSubtask(task, m.text, { assignee: m.assignee, lane: m.lane }, { commit });
          } else {
            if (task.subtasks[m.index]?.line !== m.line) throw new Error("the task changed; try again");
            if (m.type === "setSubtaskAssignee") await setSubtaskAssignee(task, m.index, m.assignee ?? undefined, { commit });
            else await setSubtaskLane(task, m.index, m.lane ?? undefined, { commit });
          }
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not update ${basename(m.path)}: ${(e as Error).message}`);
        }
      case "toggleSubtask":
        try {
          const task = (await loadBoard(o.dir)).columns.flatMap((c) => c.tasks).find((t) => t.path === m.path);
          if (!task) throw new Error("task not found");
          if (task.subtasks[m.index]?.line !== m.line) throw new Error("the task changed; try again");
          await toggleSubtask(task, m.index, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not update ${basename(m.path)}: ${(e as Error).message}`);
        }
    }
  }

  return { board, handle };
}
