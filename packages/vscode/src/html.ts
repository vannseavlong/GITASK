import { randomBytes } from "node:crypto";

/** The board page. All task text is inserted with textContent, never innerHTML. */
export function webviewHtml(): string {
  const nonce = randomBytes(16).toString("base64");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; margin: 0; }
  #bar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 4px 10px; border-radius: 2px; cursor: pointer; }
  #err { color: var(--vscode-errorForeground); }
  #board { display: flex; gap: 10px; overflow-x: auto; align-items: flex-start; }
  .col { min-width: 210px; flex: 1 0 210px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; }
  .col.over { outline: 2px dashed var(--vscode-focusBorder); }
  .col h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; opacity: .8; display: flex; justify-content: space-between; }
  .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; margin-bottom: 6px; cursor: grab; }
  .card:hover { border-color: var(--vscode-focusBorder); }
  .card.dragging { opacity: .4; }
  .title { font-size: 13px; word-break: break-word; }
  .meta { margin-top: 6px; font-size: 11px; opacity: .85; display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { padding: 0 6px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .tag.T3 { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }
  .empty { opacity: .5; font-size: 12px; padding: 4px; }
</style></head>
<body>
  <div id="bar"><button id="new">+ New task</button><span id="err"></span></div>
  <div id="board" role="list"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const boardEl = document.getElementById("board");
  const errEl = document.getElementById("err");
  let dragging = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render(board) {
    errEl.textContent = "";
    boardEl.replaceChildren();
    for (const col of board.columns) {
      const c = el("div", "col");
      const h = el("h3");
      h.append(el("span", "", col.label), el("span", "", String(col.tasks.length)));
      c.append(h);
      if (!col.tasks.length) c.append(el("div", "empty", "empty"));
      for (const t of col.tasks) {
        const card = el("div", "card");
        card.draggable = true;
        card.append(el("div", "title", t.title));
        const meta = el("div", "meta");
        if (t.prefix) meta.append(el("span", "tag", t.prefix));
        if (t.tier) meta.append(el("span", "tag " + t.tier, t.tier));
        if (t.owner) meta.append(el("span", "", t.owner));
        if (t.claimedBy) meta.append(el("span", "tag", "claimed"));
        card.append(meta);
        card.addEventListener("click", () => vscode.postMessage({ type: "open", path: t.path }));
        card.addEventListener("dragstart", (ev) => { dragging = t; card.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; });
        card.addEventListener("dragend", () => { dragging = null; card.classList.remove("dragging"); });
        c.append(card);
      }
      c.addEventListener("dragover", (ev) => { ev.preventDefault(); c.classList.add("over"); });
      c.addEventListener("dragleave", () => c.classList.remove("over"));
      c.addEventListener("drop", (ev) => {
        ev.preventDefault(); c.classList.remove("over");
        if (dragging && dragging.column !== col.id) vscode.postMessage({ type: "move", path: dragging.path, to: col.id });
      });
      boardEl.append(c);
    }
  }

  document.getElementById("new").addEventListener("click", () => vscode.postMessage({ type: "new" }));
  window.addEventListener("message", (ev) => {
    if (ev.data.type === "board") render(ev.data.board);
    if (ev.data.type === "error") errEl.textContent = ev.data.message;
  });
  vscode.postMessage({ type: "ready" });
</script></body></html>`;
}
