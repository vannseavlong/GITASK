// Message handling for `gitask serve`: the same WebviewMessage union the VS Code extension handles,
// validated by the same `validateMessage`, applied through gitask-core. No http here, so it is testable alone.
import { basename } from "node:path";
import { addSubtask, applySync, assignIds, createTask, deleteColumn, deleteSubtask, editSubtask, updateTask, deleteImpact, deleteTask, describeDeleteImpact, guardMessagePath, loadBoard, moveTask, readGithubConfig, readPeople, readTaskBody, serialQueue, setColumnColor, setSubtaskAssignee, setSubtaskLane, syncPeople, toggleSubtask, validateMessage } from "gitask-core";
import type { ApplyOptions, HostMessage } from "gitask-core";
import { taskActivityCached } from "gitask-core";
import { buildPlan, confirmProblem, syncErrorMessage, syncResultMessage, toPlanView } from "../../vscode/src/github-plan.ts";
import { handleAddPerson, handleSetOwner } from "../../vscode/src/owner.ts";
import { buildReportFile, type ReportFile } from "../../vscode/src/report-request.ts";

export interface HandlerOptions {
  /** Absolute Tasks directory. */
  dir: string;
  /** Commit changes (default true), like the extension's `gitask.autoCommit`. */
  commit?: boolean;
  staleDays?: number;
  /** Owner written into tasks created from the browser. */
  owner?: string;
  /** Environment to read `GITHUB_TOKEN` from (default `process.env`). The token comes from here only, never from a message. */
  env?: NodeJS.ProcessEnv;
  /** Test hooks for the GitHub API (fake server). */
  github?: Pick<ApplyOptions, "fetch" | "baseUrl">;
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
  const queue = serialQueue(); // every message is handled one at a time: two quick writes never race on one file

  async function board() {
    const b = await loadBoard(o.dir);
    // People: names, ids, GitHub login and role only (core never returns emails).
    const github = await readGithubConfig(o.dir); // repo/project only
    return { ...b, people: await readPeople(o.dir).catch(() => []), settings: { staleDays: o.staleDays ?? 14 }, github, activity: await taskActivityCached(o.dir) };
  }

  const err = (message: string): HandlerResult => ({ status: 200, reply: { type: "error", message }, changed: true });

  const handle = (raw: unknown): Promise<HandlerResult> => queue(() => handleNow(raw));

  async function handleNow(raw: unknown): Promise<HandlerResult> {
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
    const unsafe = await guardMessagePath(m, o.dir); // a symlink in Tasks/ must never be opened, moved or edited
    if (unsafe) return { status: 400, reply: { type: "error", message: `Rejected: ${unsafe}` }, changed: false };
    switch (m.type) {
      case "ready":
        if (!idsAssigned) {
          idsAssigned = true; // backfill task IDs once per server run, like the extension does per board
          try { await assignIds(o.dir, { commit }); } catch { /* not fatal */ }
          try { await syncPeople(o.dir, { commit }); } catch { /* not fatal: contributors from git history */ }
        }
        return { status: 200, changed: true };
      case "view":
        return { status: 200, changed: false };
      case "open":
        return { status: 200, changed: false }; // a browser cannot open a file in an editor
      case "new":
        try {
          const id = m.id ?? `New-task-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
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
      case "deleteImpact": {
        const impact = await deleteImpact(m.path, { commit });
        return { status: 200, reply: { type: "deleteImpact", path: m.path, impact, detail: describeDeleteImpact(impact) }, changed: false };
      }
      case "deleteTask":
        // The browser UI shows a confirm dialog and then sets `confirmed`; a bare delete is refused.
        if (!m.confirmed) return err(`${basename(m.path, ".md")} was not deleted: deleting needs the confirm dialog.`);
        try {
          await deleteTask(o.dir, m.path, { commit });
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not delete ${basename(m.path, ".md")}: ${(e as Error).message}`);
        }
      case "deleteColumn": {
        if (!m.confirmed) return err(`status ${m.column} was not deleted: deleting needs the confirm dialog.`);
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
      case "setOwner":
      case "addPerson":
        try {
          const b = await loadBoard(o.dir);
          await (m.type === "setOwner" ? handleSetOwner(o.dir, b, m, { commit }) : handleAddPerson(o.dir, b, m, { commit }));
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not set the owner: ${(e as Error).message}`);
        }
      case "previewReport":
        try {
          const f = await buildReportFile(o.dir, m.options, "html");
          return { status: 200, reply: { type: "reportPreview", html: f.content }, changed: false };
        } catch (e) {
          return { status: 200, reply: { type: "reportPreview", html: "", error: (e as Error).message }, changed: false };
        }
      case "exportReport":
        // A browser cannot be handed a save dialog; the UI downloads through POST /api/report instead.
        return { status: 200, reply: { type: "reportExported", ok: false, error: "Use the download route" }, changed: false };
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
      case "editTask":
      case "editSubtask":
      case "deleteSubtask":
        try {
          if (m.type === "deleteSubtask" && !m.confirmed) return err(`the sub-task was not deleted: deleting needs the confirm dialog.`);
          const task = (await loadBoard(o.dir)).columns.flatMap((c) => c.tasks).find((t) => t.path === m.path);
          if (!task) throw new Error("task not found");
          if (m.type === "editTask") await updateTask(task, m.patch, { commit });
          else {
            if (task.subtasks[m.index]?.line !== m.line) throw new Error("the task changed; try again");
            if (m.type === "editSubtask") await editSubtask(task, m.index, { text: m.text, assignee: m.assignee, lane: m.lane }, { commit });
            else await deleteSubtask(task, m.index, { commit });
          }
          return { status: 200, changed: true };
        } catch (e) {
          return err(`could not update ${basename(m.path)}: ${(e as Error).message}`);
        }
      case "githubPlan":
        try {
          const built = await buildPlan(o.dir);
          return { status: 200, reply: built.ok ? { type: "githubPlanResult", plan: toPlanView(built.plan) } : { type: "githubPlanResult", error: built.error }, changed: false };
        } catch (e) {
          return { status: 200, reply: { type: "githubPlanResult", error: (e as Error).message }, changed: false };
        }
      case "githubSync": {
        // The token is read from the server process environment only. It is never sent to or accepted from the browser.
        const token = (o.env ?? process.env).GITHUB_TOKEN?.trim();
        if (!token) return { status: 200, reply: { type: "githubSyncResult", ok: false, error: "No GITHUB_TOKEN set for the server. Stop `gitask serve`, run `export GITHUB_TOKEN=<token>` (scopes: repo, plus project for Projects) and start it again." }, changed: false };
        try {
          const built = await buildPlan(o.dir);
          if (!built.ok) return { status: 200, reply: { type: "githubSyncResult", ok: false, error: built.error }, changed: false };
          const bad = confirmProblem(built.plan, m);
          if (bad) return { status: 200, reply: { type: "githubSyncResult", ok: false, error: bad }, changed: false };
          const r = await applySync(built.plan, token, { commit, allowRepo: m.confirmRepo, ...o.github });
          return { status: 200, reply: syncResultMessage(r, built.plan.repo), changed: true };
        } catch (e) {
          return { status: 200, reply: syncErrorMessage(e, token), changed: true };
        }
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

  /** Build a downloadable report from a raw `exportReport` message (validated like every other message). */
  async function report(raw: unknown): Promise<{ status: number; file?: ReportFile; error?: string }> {
    const v = validateMessage(raw, { tasksDir: o.dir, columns: [], views: [] });
    if (!v.ok) return { status: 400, error: `Rejected: ${v.reason}` };
    if (v.message.type !== "exportReport") return { status: 400, error: "Rejected: not an exportReport message" };
    try {
      return { status: 200, file: await buildReportFile(o.dir, v.message.options, v.message.format) };
    } catch (e) {
      return { status: 500, error: (e as Error).message };
    }
  }

  return { board, handle, report };
}
