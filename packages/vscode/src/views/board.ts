import type { ViewDef } from "./registry.ts";

// Client-side source. Task text is only ever set with textContent. No backticks or ${ in here.
const js = String.raw`
GITASK.register({
  id: "board",
  mount(root, api) {
    const bar = GITASK.el("div", "board-bar");
    const newBtn = GITASK.el("button", "", "+ New task");
    const filter = GITASK.el("input", "board-filter");
    filter.type = "search";
    filter.placeholder = "Filter tasks";
    filter.setAttribute("aria-label", "Filter tasks");
    filter.value = api.state.filter || "";
    bar.append(newBtn, filter);
    const cols = GITASK.el("div", "board-cols");
    cols.setAttribute("role", "list");
    root.append(bar, cols);
    this.cols = cols;
    this.filter = filter;
    newBtn.addEventListener("click", () => api.post({ type: "new" }));
    filter.addEventListener("input", () => { api.state.filter = filter.value; api.save(); this.render(api.board, api); });
  },
  render(board, api) {
    const cols = this.cols;
    cols.replaceChildren();
    if (!board) return;
    const q = (api.state.filter || "").toLowerCase();
    let dragging = null;
    for (const col of board.columns) {
      const tasks = col.tasks.filter((t) => !q || (t.title + " " + t.id + " " + (t.owner || "") + " " + (t.claimedBy || "")).toLowerCase().includes(q));
      const c = GITASK.el("div", "col");
      const h = GITASK.el("h3");
      h.append(GITASK.el("span", "", col.label), GITASK.el("span", "", String(tasks.length)));
      c.append(h);
      if (!tasks.length) c.append(GITASK.el("div", "empty", "empty"));
      for (const t of tasks) {
        const card = GITASK.el("div", "card");
        card.draggable = true;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        const openIt = () => { if (GITASK.openDetail) GITASK.openDetail(t.path); else api.post({ type: "open", path: t.path }); };
        card.append(GITASK.el("div", "title", t.title));
        const meta = GITASK.el("div", "meta");
        if (t.prefix) meta.append(GITASK.el("span", "tag", t.prefix));
        if (t.tier) meta.append(GITASK.el("span", "tag " + (t.tier === "T3" ? "T3" : ""), t.tier));
        if (t.owner) meta.append(GITASK.el("span", "", t.owner));
        if (t.claimedBy && t.claimedBy.toLowerCase() !== "none") meta.append(GITASK.el("span", "tag", "claimed: " + t.claimedBy));
        card.append(meta);
        if (t.progress && t.progress.total > 0) {
          const p = GITASK.el("div", "progress");
          p.title = t.progress.done + " of " + t.progress.total + " done";
          const track = GITASK.el("span", "track");
          const fill = GITASK.el("span", "fill");
          fill.style.width = Math.round((100 * t.progress.done) / t.progress.total) + "%";
          track.append(fill);
          p.append(track, GITASK.el("span", "count", t.progress.done + "/" + t.progress.total));
          card.append(p);
        }
        // A drag does not fire click, so click-to-open and drag-to-move do not collide.
        card.addEventListener("click", openIt);
        card.addEventListener("keydown", (ev) => { if (ev.target === card && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); openIt(); } });
        card.addEventListener("dragstart", (ev) => { dragging = t; card.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; });
        card.addEventListener("dragend", () => { dragging = null; card.classList.remove("dragging"); });
        c.append(card);
      }
      c.addEventListener("dragover", (ev) => { ev.preventDefault(); c.classList.add("over"); });
      c.addEventListener("dragleave", () => c.classList.remove("over"));
      c.addEventListener("drop", (ev) => {
        ev.preventDefault(); c.classList.remove("over");
        if (dragging && dragging.column !== col.id) api.post({ type: "move", path: dragging.path, to: col.id });
      });
      cols.append(c);
    }
  },
});
`;

const css = `
.view-board .board-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.view-board .board-filter { flex: 0 1 220px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); padding: 3px 6px; border-radius: 2px; }
.view-board .board-cols { display: flex; gap: 10px; overflow-x: auto; align-items: flex-start; }
.view-board .col { min-width: 210px; flex: 1 0 210px; background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; }
.view-board .col.over { outline: 2px dashed var(--vscode-focusBorder); }
.view-board .col h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; opacity: .8; display: flex; justify-content: space-between; }
.view-board .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-contrastBorder, var(--vscode-panel-border)); border-radius: 4px; padding: 8px; margin-bottom: 6px; cursor: grab; }
.view-board .card:hover { border-color: var(--vscode-focusBorder); }
.view-board .card.dragging { opacity: .4; }
.view-board .title { font-size: 13px; word-break: break-word; }
.view-board .meta { margin-top: 6px; font-size: 11px; opacity: .85; display: flex; flex-wrap: wrap; gap: 4px; }
.view-board .tag { padding: 0 6px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
.view-board .tag.T3 { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }
.view-board .empty { opacity: .5; font-size: 12px; padding: 4px; }
.view-board .progress { margin-top: 6px; display: flex; align-items: center; gap: 6px; font-size: 11px; }
.view-board .progress .track { flex: 1; height: 4px; border-radius: 2px; background: var(--vscode-panel-border); overflow: hidden; display: block; }
.view-board .progress .fill { display: block; height: 100%; background: var(--vscode-progressBar-background); }
`;

const board: ViewDef = { id: "board", label: "Board", js, css };
export default board;
