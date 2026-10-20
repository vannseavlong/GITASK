import * as vscode from "vscode";
import { basename, join } from "node:path";
import { assignIds, createTask, deleteColumn, deleteImpact, deleteTask, initTasks, loadBoard, moveTask, toggleSubtask } from "gitask-core";
import { webviewHtml } from "./html.ts";
import { validateMessage, type HostMessage } from "./protocol.ts";
import { readTaskBody } from "./taskfile.ts";
import { DEFAULT_VIEW, VIEWS } from "./views/registry.ts";

const VIEW_KEY = "gitask.lastView";
let log: vscode.OutputChannel | undefined;

let panel: vscode.WebviewPanel | undefined;
let idsAssigned = false;

function tasksDir(): string | undefined {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return undefined;
  return join(root, vscode.workspace.getConfiguration("gitask").get<string>("tasksDir", "Tasks"));
}

function send(msg: HostMessage): void {
  void panel?.webview.postMessage(msg);
}

async function post(): Promise<void> {
  const dir = tasksDir();
  if (!panel || !dir) return;
  try {
    const board = await loadBoard(dir);
    const staleDays = vscode.workspace.getConfiguration("gitask").get<number>("staleDays", 14);
    send({ type: "board", board: { ...board, settings: { staleDays } } });
  } catch (e) {
    send({ type: "error", message: `Cannot read ${dir}: ${(e as Error).message}` });
  }
}

async function newTask(column?: string): Promise<void> {
  const dir = tasksDir();
  if (!dir) return;
  const id = await vscode.window.showInputBox({
    prompt: "Task id, e.g. Web-login-page",
    validateInput: (v) => (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v) ? undefined : "Letters, digits, . _ - only"),
  });
  if (!id) return;
  try {
    const owner = vscode.workspace.getConfiguration("git").get<string>("userName");
    const file = await createTask(dir, column ?? "1-backlog", id, { owner });
    await vscode.window.showTextDocument(vscode.Uri.file(file));
  } catch (e) {
    vscode.window.showErrorMessage(`GITASK: ${(e as Error).message}`);
  }
  await post();
}

async function initTasksFolder(ctx: vscode.ExtensionContext): Promise<void> {
  const dir = tasksDir();
  if (!dir) return void vscode.window.showErrorMessage("GITASK: open a folder first.");
  try {
    const { created } = await initTasks(dir);
    if (!created.length) vscode.window.showInformationMessage("GITASK: the Tasks folder is already set up.");
    else vscode.window.showInformationMessage(`GITASK: created ${created.length} item(s) in ${basename(dir)}/. Add a task with "GITASK: New Task".`);
  } catch (e) {
    return void vscode.window.showErrorMessage(`GITASK: ${(e as Error).message}`);
  }
  openBoard(ctx);
  await post();
}

function openBoard(ctx: vscode.ExtensionContext): void {
  if (panel) return panel.reveal();
  panel = vscode.window.createWebviewPanel("gitask", "GITASK", vscode.ViewColumn.Active, { enableScripts: true });
  panel.webview.html = webviewHtml(VIEWS, { initialView: ctx.workspaceState.get<string>(VIEW_KEY, DEFAULT_VIEW) });
  idsAssigned = false;
  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions);

  panel.webview.onDidReceiveMessage(async (raw: unknown) => {
    const dir = tasksDir();
    if (!dir) return;
    // Validate before anything touches the filesystem or git. Columns come from the folders on disk.
    let board;
    try {
      board = await loadBoard(dir);
    } catch (e) {
      return send({ type: "error", message: `Cannot read ${dir}: ${(e as Error).message}` });
    }
    const v = validateMessage(raw, { tasksDir: dir, columns: board.columns.map((c) => c.id), views: VIEWS.map((x) => x.id) });
    if (!v.ok) {
      log?.appendLine(`Rejected webview message: ${v.reason}`);
      return;
    }
    const m = v.message;
    const cfg = vscode.workspace.getConfiguration("gitask");
    switch (m.type) {
      case "ready":
        if (!idsAssigned) {
          idsAssigned = true; // backfill task IDs once per opened board
          try {
            await assignIds(dir, { commit: cfg.get<boolean>("autoCommit", true) });
          } catch (e) {
            log?.appendLine(`Could not assign task IDs: ${(e as Error).message}`);
          }
        }
        return post();
      case "view":
        return void ctx.workspaceState.update(VIEW_KEY, m.id);
      case "open":
        return void vscode.window.showTextDocument(vscode.Uri.file(m.path));
      case "new":
        return newTask(m.column);
      case "move":
        try {
          await moveTask(dir, m.path, m.to, {
            commit: cfg.get<boolean>("autoCommit", true),
            message: cfg.get<string>("commitMessage"),
          });
        } catch (e) {
          vscode.window.showErrorMessage(`GITASK: could not move ${basename(m.path)}: ${(e as Error).message}`);
        }
        return post(); // always resync so the UI reflects what is on disk
      case "deleteTask": {
        const name = basename(m.path, ".md");
        const commit = cfg.get<boolean>("autoCommit", true);
        const impact = await deleteImpact(m.path, { commit });
        const detail = impact === "recoverable" ? "The file is removed and the removal is committed, so it can be restored from git history."
          : impact === "loses-local-edits" ? "This file has uncommitted edits. They will be lost; only the last committed version stays in git history."
          : "This file is not committed (untracked, or auto-commit is off). It will be permanently removed and cannot be restored.";
        const ok = await vscode.window.showWarningMessage(`Delete task "${name}"?`, { modal: true, detail }, "Delete");
        if (ok !== "Delete") return;
        try {
          await deleteTask(dir, m.path, { commit });
        } catch (e) {
          vscode.window.showErrorMessage(`GITASK: could not delete ${name}: ${(e as Error).message}`);
        }
        return post();
      }
      case "deleteColumn": {
        const col = board.columns.find((c) => c.id === m.column);
        if (col?.tasks.length) return void vscode.window.showErrorMessage(`GITASK: cannot delete status "${col.label}": it still has ${col.tasks.length} task(s). Move or delete them first.`);
        const ok = await vscode.window.showWarningMessage(`Delete the empty status "${col?.label ?? m.column}"?`, { modal: true, detail: `The folder ${m.column}/ is removed.` }, "Delete");
        if (ok !== "Delete") return;
        try {
          await deleteColumn(dir, m.column, { commit: cfg.get<boolean>("autoCommit", true) });
        } catch (e) {
          vscode.window.showErrorMessage(`GITASK: ${(e as Error).message}`);
        }
        return post();
      }
      case "readTask": {
        const r = await readTaskBody(m.path, dir);
        return send({ type: "taskBody", path: m.path, ...r });
      }
      case "toggleSubtask": {
        const task = board.columns.flatMap((c) => c.tasks).find((t) => t.path === m.path);
        try {
          if (!task) throw new Error("task not found");
          // The webview's index refers to the board it saw; refuse if the file has shifted since.
          if (task.subtasks[m.index]?.line !== m.line) throw new Error("the task changed; try again");
          await toggleSubtask(task, m.index, { commit: cfg.get<boolean>("autoCommit", true) });
        } catch (e) {
          vscode.window.showErrorMessage(`GITASK: could not update ${basename(m.path)}: ${(e as Error).message}`);
        }
        return post();
      }
    }
  }, undefined, ctx.subscriptions);

  const root = vscode.workspace.workspaceFolders?.[0];
  if (root) {
    const rel = vscode.workspace.getConfiguration("gitask").get<string>("tasksDir", "Tasks");
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, `${rel}/**/*.md`));
    let timer: NodeJS.Timeout | undefined;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(post, 150); };
    watcher.onDidCreate(refresh); watcher.onDidChange(refresh); watcher.onDidDelete(refresh);
    panel.onDidDispose(() => watcher.dispose());
  }
}

export function activate(ctx: vscode.ExtensionContext): void {
  log = vscode.window.createOutputChannel("GITASK");
  ctx.subscriptions.push(log);
  ctx.subscriptions.push(
    vscode.commands.registerCommand("gitask.openBoard", () => openBoard(ctx)),
    vscode.commands.registerCommand("gitask.newTask", () => newTask()),
    vscode.commands.registerCommand("gitask.initTasks", () => initTasksFolder(ctx)),
  );
}

export function deactivate(): void {}
