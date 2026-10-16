import * as vscode from "vscode";
import { basename, join } from "node:path";
import { createTask, loadBoard, moveTask } from "gitask-core";
import { webviewHtml } from "./html.ts";

let panel: vscode.WebviewPanel | undefined;

function tasksDir(): string | undefined {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return undefined;
  return join(root, vscode.workspace.getConfiguration("gitask").get<string>("tasksDir", "Tasks"));
}

async function post(): Promise<void> {
  const dir = tasksDir();
  if (!panel || !dir) return;
  try {
    const board = await loadBoard(dir);
    panel.webview.postMessage({ type: "board", board });
  } catch (e) {
    panel.webview.postMessage({ type: "error", message: `Cannot read ${dir}: ${(e as Error).message}` });
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

function openBoard(ctx: vscode.ExtensionContext): void {
  if (panel) return panel.reveal();
  panel = vscode.window.createWebviewPanel("gitask", "GITASK", vscode.ViewColumn.Active, { enableScripts: true });
  panel.webview.html = webviewHtml();
  panel.onDidDispose(() => (panel = undefined), undefined, ctx.subscriptions);

  panel.webview.onDidReceiveMessage(async (m: { type: string; path?: string; to?: string; column?: string }) => {
    const dir = tasksDir();
    if (!dir) return;
    if (m.type === "ready") return post();
    if (m.type === "open" && m.path) return void vscode.window.showTextDocument(vscode.Uri.file(m.path));
    if (m.type === "new") return newTask(m.column);
    if (m.type === "move" && m.path && m.to) {
      const cfg = vscode.workspace.getConfiguration("gitask");
      try {
        await moveTask(dir, m.path, m.to, {
          commit: cfg.get<boolean>("autoCommit", true),
          message: cfg.get<string>("commitMessage"),
        });
      } catch (e) {
        vscode.window.showErrorMessage(`GITASK: could not move ${basename(m.path)}: ${(e as Error).message}`);
      }
      await post(); // always resync so the UI reflects what is on disk
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
  ctx.subscriptions.push(
    vscode.commands.registerCommand("gitask.openBoard", () => openBoard(ctx)),
    vscode.commands.registerCommand("gitask.newTask", () => newTask()),
  );
}

export function deactivate(): void {}
