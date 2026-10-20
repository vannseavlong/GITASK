import { randomBytes } from "node:crypto";
import { DETAIL_CSS, DETAIL_JS } from "./detail.ts";
import { MARKDOWN_JS } from "./markdown.ts";
import { STATUS_VISIBILITY_SRC } from "./status-visibility.ts";
import { DEFAULT_VIEW, checkViews, type ViewDef } from "./views/registry.ts";

export interface HtmlOptions {
  /** Fixed nonce for tests; a random one is used otherwise. */
  nonce?: string;
  /** View to open first (the remembered one). */
  initialView?: string;
}

/** JSON that is safe inside a <script> element. */
function jsonForScript(v: unknown): string {
  return JSON.stringify(v).replace(/[<\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

const SHELL_CSS = `
  html, body { height: 100%; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 0; margin: 0; display: flex; flex-direction: column; }
  button { font-family: inherit; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 1px solid var(--vscode-contrastBorder, transparent); padding: 4px 10px; border-radius: 2px; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button:focus-visible, input:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
  #tabs { display: flex; gap: 2px; padding: 6px 12px 0; border-bottom: 1px solid var(--vscode-panel-border); flex: none; align-items: flex-end; }
  #tabs button.tab { background: transparent; color: var(--vscode-foreground); border: 0; border-bottom: 2px solid transparent; border-radius: 0; padding: 6px 12px; opacity: .75; }
  #tabs button.tab:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
  #tabs button.tab[aria-selected="true"] { opacity: 1; border-bottom-color: var(--vscode-focusBorder); }
  #err { color: var(--vscode-errorForeground); padding: 0 12px; flex: none; }
  #err:empty { display: none; }
  #views { flex: 1; min-height: 0; position: relative; }
  .view { position: absolute; inset: 0; overflow: auto; padding: 12px; box-sizing: border-box; }
  .view[hidden] { display: none; }
  .placeholder { opacity: .75; padding: 24px 4px; }
  #status-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border); flex: none; font-size: 12px; }
  #status-bar:empty { display: none; }
  #status-bar .sb-label { opacity: .8; }
  #status-bar button.sb-chip { background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-panel-border); border-radius: 10px; padding: 1px 8px; font-size: 12px; }
  #status-bar button.sb-chip[aria-pressed="false"] { opacity: .55; text-decoration: line-through; }
  #status-bar button.sb-chip:hover { background: var(--vscode-toolbar-hoverBackground); }
  #status-bar .sb-note { opacity: .8; margin-left: auto; }
  #status-empty { padding: 24px 12px; opacity: .75; }
  #status-empty[hidden] { display: none; }
  .placeholder h2 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
`;

const SHELL_JS = String.raw`
const vscodeApi = acquireVsCodeApi();
const defs = window.__GITASK_VIEWS__;
const saved = vscodeApi.getState() || {};
const stored = { view: saved.view, views: saved.views || {}, hiddenStatuses: Array.isArray(saved.hiddenStatuses) ? saved.hiddenStatuses : [] };
const impls = {};
const mounted = {};
const panes = {};
const tabs = {};
let board = null;
let rawBoard = null;
let current = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function persist() { try { vscodeApi.setState(stored); } catch (e) {} }
function post(msg) { vscodeApi.postMessage(msg); }
function viewState(id) { return stored.views[id] || (stored.views[id] = {}); }
const errEl = document.getElementById("err");
const tabsEl = document.getElementById("tabs");
const viewsEl = document.getElementById("views");

const statusBarEl = document.getElementById("status-bar");
const statusEmptyEl = document.getElementById("status-empty");
// One hidden-status set for all four views. Views only ever see the board without those columns.
function applyStatusVisibility() {
  stored.hiddenStatuses = SV.sanitize(stored.hiddenStatuses, rawBoard);
  board = SV.apply(rawBoard, stored.hiddenStatuses);
  statusBarEl.replaceChildren();
  statusEmptyEl.hidden = true;
  viewsEl.hidden = false;
  if (!rawBoard || !rawBoard.columns.length) return;
  const sum = SV.summary(rawBoard, stored.hiddenStatuses);
  statusBarEl.append(el("span", "sb-label", "Statuses:"));
  for (const c of SV.chips(rawBoard, stored.hiddenStatuses)) {
    const b = el("button", "sb-chip", c.label + " " + c.count);
    b.type = "button";
    b.setAttribute("aria-pressed", c.hidden ? "false" : "true");
    b.title = (c.hidden ? "Show " : "Hide ") + c.label;
    b.addEventListener("click", () => {
      stored.hiddenStatuses = SV.toggle(stored.hiddenStatuses, c.id, rawBoard);
      persist();
      applyStatusVisibility();
      renderView(current);
    });
    statusBarEl.append(b);
  }
  if (sum.filtered) {
    const all = el("button", "sb-chip", "Show all");
    all.type = "button";
    all.addEventListener("click", () => { stored.hiddenStatuses = []; persist(); applyStatusVisibility(); renderView(current); });
    statusBarEl.append(all);
    statusBarEl.append(el("span", "sb-note", "Filtered: " + sum.shown + " of " + sum.total + " statuses shown, " + sum.hiddenTasks + (sum.hiddenTasks === 1 ? " task" : " tasks") + " hidden"));
  }
  if (sum.allHidden) {
    statusEmptyEl.textContent = "All statuses are hidden. Click a status above, or Show all.";
    statusEmptyEl.hidden = false;
    viewsEl.hidden = true;
  }
}

window.GITASK = {
  el,
  register(impl) { impls[impl.id] = impl; },
};

function apiFor(id) {
  return {
    post,
    get board() { return board; },
    state: viewState(id),
    save: persist,
  };
}

function renderView(id) {
  const def = defs.find((d) => d.id === id);
  const pane = panes[id];
  const impl = impls[id];
  if (!impl) return;
  const api = apiFor(id);
  try {
    if (!mounted[id]) { impl.mount(pane, api); mounted[id] = true; }
    impl.render(board, api);
    // A reloaded webview starts with an empty pane, so the scroll saved earlier could not apply yet.
    if (!pane.hidden) pane.scrollTop = viewState(id).scroll || 0;
  } catch (e) {
    errEl.textContent = "View " + def.label + " failed: " + (e && e.message ? e.message : String(e));
  }
}

function show(id, notify) {
  if (!panes[id]) id = defs[0].id;
  if (current && panes[current]) viewState(current).scroll = panes[current].scrollTop;
  current = id;
  for (const d of defs) {
    const on = d.id === id;
    panes[d.id].hidden = !on;
    tabs[d.id].setAttribute("aria-selected", on ? "true" : "false");
    tabs[d.id].tabIndex = on ? 0 : -1;
  }
  renderView(id);
  panes[id].scrollTop = viewState(id).scroll || 0;
  stored.view = id;
  persist();
  if (notify) post({ type: "view", id });
}

for (const d of defs) {
  const tab = el("button", "tab", d.label);
  tab.setAttribute("role", "tab");
  tab.addEventListener("click", () => show(d.id, true));
  tab.addEventListener("keydown", (ev) => {
    const step = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    ev.preventDefault();
    const next = defs[(defs.findIndex((x) => x.id === d.id) + step + defs.length) % defs.length];
    show(next.id, true);
    tabs[next.id].focus();
  });
  tabs[d.id] = tab;
  tabsEl.append(tab);
  const pane = el("div", "view view-" + d.id);
  pane.setAttribute("role", "tabpanel");
  pane.hidden = true;
  pane.addEventListener("scroll", () => { viewState(d.id).scroll = pane.scrollTop; });
  panes[d.id] = pane;
  viewsEl.append(pane);
}
tabsEl.setAttribute("role", "tablist");
`;

const SHELL_START_JS = String.raw`
for (const d of defs) {
  if (!impls[d.id]) {
    impls[d.id] = {
      id: d.id,
      mount(root) {
        const box = el("div", "placeholder");
        box.append(el("h2", "", d.label + " is not available yet"), el("div", "", "This view has not been built yet."));
        root.append(box);
      },
      render() {},
    };
  }
}
window.addEventListener("message", (ev) => {
  const m = ev.data;
  if (!m || typeof m.type !== "string") return;
  if (m.type === "board") { rawBoard = m.board; applyStatusVisibility(); errEl.textContent = ""; renderView(current); if (GITASK.onBoard) GITASK.onBoard(rawBoard); }
  if (GITASK.onHost) GITASK.onHost(m);
  if (m.type === "error") errEl.textContent = String(m.message);
});
persist();
show(stored.view && panes[stored.view] ? stored.view : window.__GITASK_INITIAL__, false);
post({ type: "ready" });
`;

/**
 * The webview page: tab bar plus one pane per registered view. One nonce'd script and one nonce'd
 * style, no inline handlers. Task text reaches the DOM only through textContent.
 */
export function webviewHtml(views: readonly ViewDef[], opts: HtmlOptions = {}): string {
  checkViews(views);
  const nonce = opts.nonce ?? randomBytes(16).toString("base64");
  const initial = views.some((v) => v.id === opts.initialView) ? opts.initialView! : (views.find((v) => v.id === DEFAULT_VIEW) ?? views[0]).id;
  const defs = views.map((v) => ({ id: v.id, label: v.label }));
  const viewJs = views
    .filter((v) => v.js)
    .map((v) => `try {\n${v.js}\n} catch (e) { errEl.textContent = "View ${v.id} failed to load: " + e.message; }`)
    .join("\n");
  const css = views.map((v) => v.css ?? "").join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>GITASK</title>
<style nonce="${nonce}">${SHELL_CSS}${DETAIL_CSS}${css}</style></head>
<body>
  <div id="tabs"></div>
  <div id="err" role="alert"></div>
  <div id="status-bar" role="group" aria-label="Show or hide statuses"></div>
  <div id="status-empty" role="status" hidden></div>
  <div id="views"></div>
<script nonce="${nonce}">
window.__GITASK_VIEWS__ = ${jsonForScript(defs)};
window.__GITASK_INITIAL__ = ${jsonForScript(initial)};
${SHELL_JS}
${MARKDOWN_JS}
${STATUS_VISIBILITY_SRC}
${DETAIL_JS}
${viewJs}
${SHELL_START_JS}
</script></body></html>`;
}
