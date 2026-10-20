import type { ViewDef } from "./registry.ts";
import { computeOverview } from "./overview-logic.ts";

// Client-side source. Task text is only ever set with textContent. No backticks or ${ in here.
// computeOverview is embedded from overview-logic.ts so the tested code is the shipped code.
const client = String.raw`
GITASK.register({
  id: "overview",
  mount(root, api) {
    this.box = GITASK.el("div", "ov");
    root.append(this.box);
  },
  render(board, api) {
    const box = this.box;
    box.replaceChildren();
    if (!board) return;
    const d = new Date();
    const pad = (n) => (n < 10 ? "0" : "") + n;
    const today = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const staleDays = board.settings && typeof board.settings.staleDays === "number" ? board.settings.staleDays : 14;
    const o = computeOverview(board, { today: today, staleDays: staleDays });
    if (o.total === 0) { box.append(GITASK.el("div", "ov-empty", "No tasks yet.")); return; }

    const tiles = GITASK.el("div", "ov-tiles");
    const tile = (n, label, warn) => {
      const t = GITASK.el("div", "ov-tile" + (warn && n > 0 ? " warn" : ""));
      t.append(GITASK.el("div", "ov-num", String(n)), GITASK.el("div", "ov-lbl", label));
      tiles.append(t);
    };
    tile(o.total, "tasks", false);
    tile(o.overdue.length, "overdue", true);
    tile(o.stale.length, "not updated for " + o.staleDays + "+ days", true);
    tile(o.claimed.length, "claimed", false);
    box.append(tiles);

    const bars = (title, rows, key, label, colorOf) => {
      const sec = GITASK.el("section", "ov-sec");
      sec.append(GITASK.el("h3", "", title));
      const max = Math.max(1, ...rows.map((r) => r.count));
      for (const r of rows) {
        const row = GITASK.el("div", "ov-bar");
        row.append(GITASK.el("span", "ov-name", label(r)));
        const track = GITASK.el("span", "ov-track");
        const fill = GITASK.el("span", "ov-fill");
        fill.style.width = Math.round((100 * r.count) / max) + "%";
        const clr = colorOf ? colorOf(r) : "";
        if (clr) fill.style.background = clr;
        track.append(fill);
        row.append(track, GITASK.el("span", "ov-count", String(r.count)));
        sec.append(row);
      }
      return sec;
    };
    const grid = GITASK.el("div", "ov-grid");
    grid.append(
      bars("By status", o.byStatus, "id", (r) => r.label, (r) => { const c = board.columns.find((x) => x.id === r.id); return c && c.color ? c.color : ""; }),
      bars("By tier", o.byTier, "key", (r) => (r.key === "none" ? "no tier" : r.key)),
      bars("By owner", o.byOwner, "key", (r) => r.key),
    );
    box.append(grid);

    const open = (item) => {
      if (GITASK.openDetail) GITASK.openDetail(item.path);
      else api.post({ type: "open", path: item.path });
    };
    const LIMIT = 25;
    const list = (id, title, items, note, detail) => {
      const sec = GITASK.el("section", "ov-sec");
      sec.append(GITASK.el("h3", "", title + " (" + items.length + ")"));
      if (!items.length) { sec.append(GITASK.el("div", "ov-none", note)); return sec; }
      const all = !!api.state["all-" + id];
      const shown = all ? items : items.slice(0, LIMIT);
      const ul = GITASK.el("ul", "ov-list");
      for (const it of shown) {
        const li = GITASK.el("li");
        const b = GITASK.el("button", "ov-item");
        b.append(GITASK.el("span", "ov-title", it.title));
        b.append(GITASK.el("span", "ov-detail", detail(it)));
        b.addEventListener("click", () => open(it));
        li.append(b);
        ul.append(li);
      }
      sec.append(ul);
      if (items.length > LIMIT) {
        const more = GITASK.el("button", "ov-more", all ? "Show fewer" : "Show all " + items.length);
        more.addEventListener("click", () => { api.state["all-" + id] = !all; api.save(); this.render(api.board, api); });
        sec.append(more);
      }
      return sec;
    };
    const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
    const lists = GITASK.el("div", "ov-grid");
    lists.append(
      list("overdue", "Overdue", o.overdue, "Nothing is overdue.", (it) => "due " + it.date + ", " + plural(it.days, "day") + " late"),
      list("stale", "Not updated for " + o.staleDays + "+ days", o.stale, "Nothing is stale.", (it) => "updated " + it.date + ", " + plural(it.days, "day") + " ago"),
      list("claimed", "Claimed", o.claimed, "No task is claimed.", (it) => "claimed by " + it.claimedBy),
      list("recent", "Recently updated", o.recent, "No dated tasks.", (it) => "updated " + it.date + " in " + it.column),
    );
    box.append(lists);
    if (o.undated > 0) box.append(GITASK.el("div", "ov-none", plural(o.undated, "open task") + " without an updated date are not counted as stale."));
  },
});
`;

const js = "const computeOverview = " + computeOverview.toString() + ";\n" + client;

const css = `
.view-overview .ov-tiles { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.view-overview .ov-tile { min-width: 130px; padding: 10px 14px; border: 1px solid var(--vscode-contrastBorder, var(--vscode-panel-border)); border-radius: 4px; background: var(--vscode-sideBar-background); }
.view-overview .ov-tile.warn { border-color: var(--vscode-errorForeground); }
.view-overview .ov-num { font-size: 24px; font-weight: 600; }
.view-overview .ov-lbl { font-size: 12px; opacity: .8; }
.view-overview .ov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px; align-items: start; }
.view-overview .ov-sec { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 10px; background: var(--vscode-sideBar-background); min-width: 0; }
.view-overview h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; opacity: .85; }
.view-overview .ov-bar { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 12px; }
.view-overview .ov-name { flex: 0 0 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.view-overview .ov-track { flex: 1; height: 8px; border-radius: 4px; background: var(--vscode-panel-border); overflow: hidden; display: block; }
.view-overview .ov-fill { display: block; height: 100%; background: var(--vscode-progressBar-background); }
.view-overview .ov-count { flex: 0 0 auto; min-width: 2ch; text-align: right; font-weight: 600; }
.view-overview .ov-list { list-style: none; margin: 0; padding: 0; }
.view-overview .ov-item { display: block; width: 100%; text-align: left; background: transparent; color: var(--vscode-foreground); border: 0; border-radius: 2px; padding: 4px 6px; }
.view-overview .ov-item:hover { background: var(--vscode-list-hoverBackground); }
.view-overview .ov-title { display: block; word-break: break-word; }
.view-overview .ov-detail { display: block; font-size: 11px; opacity: .75; }
.view-overview .ov-more { margin-top: 6px; }
.view-overview .ov-none, .view-overview .ov-empty { opacity: .7; font-size: 12px; padding: 4px 0; }
`;

const overview: ViewDef = { id: "overview", label: "Overview", js, css };
export default overview;
