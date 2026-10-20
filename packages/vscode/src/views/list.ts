import type { ViewDef } from "./registry.ts";
import { LOGIC_SRC } from "./list-logic.ts";

// Client-side source. Task text is only ever set with textContent. No backticks or dollar-brace in here.
const view = String.raw`
GITASK.register({
  id: "list",
  mount(root, api) {
    const bar = GITASK.el("div", "list-bar");
    const search = GITASK.el("input", "list-search");
    search.type = "search";
    search.placeholder = "Search title, id, owner";
    search.setAttribute("aria-label", "Search tasks");
    search.value = api.state.q || "";
    const selects = {};
    for (const [key, label] of [["status", "Status"], ["tier", "Tier"], ["owner", "Owner"]]) {
      const s = GITASK.el("select", "list-filter");
      s.setAttribute("aria-label", "Filter by " + label.toLowerCase());
      selects[key] = s;
      s.addEventListener("change", () => { api.state[key] = s.value; api.save(); this.render(api.board, api); });
    }
    const count = GITASK.el("span", "list-count");
    count.setAttribute("aria-live", "polite");
    bar.append(search, selects.status, selects.tier, selects.owner, count);
    const table = GITASK.el("table", "list-table");
    const caption = GITASK.el("caption", "list-caption", "All tasks");
    const thead = GITASK.el("thead");
    const hr = GITASK.el("tr");
    this.heads = {};
    for (const c of LIST_COLUMNS) {
      const th = GITASK.el("th");
      th.scope = "col";
      const b = GITASK.el("button", "list-sort", c.label);
      b.type = "button";
      b.append(GITASK.el("span", "list-arrow"));
      b.addEventListener("click", () => {
        const s = api.state;
        if (s.sort !== c.key) { s.sort = c.key; s.dir = "asc"; }
        else if (s.dir === "asc") s.dir = "desc";
        else { s.sort = ""; s.dir = ""; }
        api.save();
        this.render(api.board, api);
        b.focus();
      });
      th.append(b);
      hr.append(th);
      this.heads[c.key] = { th, b };
    }
    const act = GITASK.el("th", "", "Open");
    act.scope = "col";
    hr.append(act);
    thead.append(hr);
    const tbody = GITASK.el("tbody");
    table.append(caption, thead, tbody);
    const empty = GITASK.el("div", "list-empty");
    root.append(bar, table, empty);
    search.addEventListener("input", () => { api.state.q = search.value; api.save(); this.render(api.board, api); });
    Object.assign(this, { search, selects, count, tbody, table, empty });
  },
  render(board, api) {
    const st = api.state;
    const { all, shown } = listView(board, st);
    for (const key of ["status", "tier", "owner"]) {
      const s = this.selects[key];
      const opts = listOptions(all, key);
      if (st[key] && opts.indexOf(st[key]) < 0) { st[key] = ""; }
      s.replaceChildren();
      const first = GITASK.el("option", "", { status: "All statuses", tier: "All tiers", owner: "All owners" }[key]);
      first.value = "";
      s.append(first);
      for (const o of opts) { const op = GITASK.el("option", "", o); op.value = o; s.append(op); }
      s.value = st[key] || "";
    }
    for (const c of LIST_COLUMNS) {
      const h = this.heads[c.key];
      const on = st.sort === c.key && (st.dir === "asc" || st.dir === "desc");
      h.th.setAttribute("aria-sort", on ? (st.dir === "asc" ? "ascending" : "descending") : "none");
      h.b.lastChild.textContent = on ? (st.dir === "asc" ? " ▲" : " ▼") : "";
    }
    this.count.textContent = shown.length + " of " + all.length;
    this.tbody.replaceChildren();
    this.table.hidden = shown.length === 0;
    this.empty.textContent = !all.length ? "No tasks yet." : shown.length ? "" : "No tasks match the current filters.";
    for (const r of shown) {
      const tr = GITASK.el("tr", "list-row");
      tr.tabIndex = 0;
      tr.append(GITASK.el("td", "c-id", r.displayId), GITASK.el("td", "c-title", r.title), GITASK.el("td", "", r.status), GITASK.el("td", "", r.tier),
        GITASK.el("td", "", r.owner), GITASK.el("td", "", r.claimedBy), GITASK.el("td", "", r.updated), GITASK.el("td", "", r.due));
      const p = GITASK.el("td", "c-progress");
      if (r.total) {
        const track = GITASK.el("span", "track");
        const fill = GITASK.el("span", "fill");
        fill.style.width = Math.round(r.progress * 100) + "%";
        track.append(fill);
        p.title = r.done + " of " + r.total + " done";
        p.append(track, GITASK.el("span", "count", r.done + "/" + r.total));
      }
      tr.append(p);
      const a = GITASK.el("td", "c-open");
      const ob = GITASK.el("button", "list-open", "Open file");
      ob.type = "button";
      ob.setAttribute("aria-label", "Open file " + r.id);
      ob.addEventListener("click", (ev) => { ev.stopPropagation(); api.post({ type: "open", path: r.path }); });
      a.append(ob);
      tr.append(a);
      const detail = () => { GITASK.openDetail && GITASK.openDetail(r.path); };
      tr.addEventListener("click", detail);
      tr.addEventListener("keydown", (ev) => {
        if (ev.target !== tr) return;
        if (ev.key === "Enter") { ev.preventDefault(); detail(); }
        else if (ev.key === "ArrowDown" && tr.nextElementSibling) { ev.preventDefault(); tr.nextElementSibling.focus(); }
        else if (ev.key === "ArrowUp" && tr.previousElementSibling) { ev.preventDefault(); tr.previousElementSibling.focus(); }
      });
      this.tbody.append(tr);
    }
  },
});
`;

const js = LOGIC_SRC + "\n" + view;

const css = `
.view-list .list-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.view-list .list-search, .view-list .list-filter { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); padding: 3px 6px; border-radius: 2px; font-family: inherit; }
.view-list .list-search { flex: 0 1 220px; }
.view-list .list-filter { background: var(--vscode-dropdown-background, var(--vscode-input-background)); color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground)); }
.view-list .list-count { opacity: .8; margin-left: auto; }
.view-list .list-caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.view-list .list-table { width: 100%; border-collapse: collapse; }
.view-list th, .view-list td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: middle; }
.view-list th { font-size: 12px; white-space: nowrap; }
.view-list .list-sort { background: transparent; color: var(--vscode-foreground); border: 0; padding: 2px 4px; font-weight: 600; }
.view-list .list-sort:hover { background: var(--vscode-toolbar-hoverBackground); }
.view-list th[aria-sort="ascending"] .list-sort, .view-list th[aria-sort="descending"] .list-sort { color: var(--vscode-textLink-foreground); }
.view-list .list-row { cursor: pointer; }
.view-list .list-row:hover { background: var(--vscode-list-hoverBackground); }
.view-list .list-row:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.view-list .c-id { white-space: nowrap; opacity: .8; font-family: var(--vscode-editor-font-family, monospace); }
.view-list .c-title { word-break: break-word; min-width: 160px; }
.view-list .c-progress { white-space: nowrap; min-width: 110px; }
.view-list .c-progress .track { display: inline-block; width: 60px; height: 4px; border-radius: 2px; background: var(--vscode-panel-border); overflow: hidden; vertical-align: middle; margin-right: 6px; }
.view-list .c-progress .fill { display: block; height: 100%; background: var(--vscode-progressBar-background); }
.view-list .c-progress .count { font-size: 11px; }
.view-list .list-open { padding: 2px 8px; font-size: 11px; }
.view-list .list-empty { opacity: .7; padding: 24px 4px; }
.view-list .list-empty:empty { display: none; }
.view-list .list-table[hidden] { display: none; }
`;

const list: ViewDef = { id: "list", label: "List", js, css };
export default list;
