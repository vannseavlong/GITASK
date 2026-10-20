import type { ViewDef } from "./registry.ts";
import { timelineLogic } from "./timeline-logic.ts";

// Client-side source. Task text only reaches the DOM through textContent / setAttribute.
// No backticks or dollar-brace in here: it is a String.raw template.
const client = String.raw`
const SVGNS = "http://www.w3.org/2000/svg";
function svg(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (text !== undefined) e.textContent = text;
  return e;
}
function openTask(path) { if (GITASK.openDetail) GITASK.openDetail(path); }
function activate(node, path) {
  node.addEventListener("click", () => openTask(path));
  node.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openTask(path); }
  });
}
function statusOf(board, column) {
  for (const c of board.columns) if (c.id === column) return c.label;
  return column;
}
function columnIndex(board, column) {
  for (let i = 0; i < board.columns.length; i++) if (board.columns[i].id === column) return i;
  return 0;
}

GITASK.register({
  id: "timeline",
  mount(root, api) {
    const st = api.state;
    const now = TL.todayFrom(new Date());
    if (st.mode !== "waterfall" && st.mode !== "calendar") st.mode = "calendar";
    if (TL.ZOOMS.indexOf(st.zoom) < 0) st.zoom = "month";
    if (typeof st.year !== "number" || typeof st.month !== "number") {
      const p = new Date(now * 86400000);
      st.year = p.getUTCFullYear(); st.month = p.getUTCMonth();
    }
    const bar = GITASK.el("div", "tl-bar");
    const modes = GITASK.el("div", "tl-group");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Timeline mode");
    const bCal = GITASK.el("button", "tl-toggle", "Calendar");
    const bWf = GITASK.el("button", "tl-toggle", "Waterfall");
    modes.append(bCal, bWf);
    const nav = GITASK.el("div", "tl-group tl-nav");
    const bPrev = GITASK.el("button", "", "Previous");
    const bToday = GITASK.el("button", "", "Today");
    const bNext = GITASK.el("button", "", "Next");
    const label = GITASK.el("strong", "tl-label");
    label.setAttribute("aria-live", "polite");
    nav.append(bPrev, bToday, bNext, label);
    const zoom = GITASK.el("div", "tl-group tl-zoom");
    zoom.setAttribute("role", "group");
    zoom.setAttribute("aria-label", "Zoom");
    const zbtn = {};
    for (const z of TL.ZOOMS) {
      const b = GITASK.el("button", "tl-toggle", z.charAt(0).toUpperCase() + z.slice(1));
      b.addEventListener("click", () => { st.zoom = z; api.save(); this.render(api.board, api); });
      zbtn[z] = b;
      zoom.append(b);
    }
    bar.append(modes, nav, zoom);
    const note = GITASK.el("div", "tl-note");
    const body = GITASK.el("div", "tl-body");
    root.append(bar, note, body);
    Object.assign(this, { bCal, bWf, nav, zoom, zbtn, label, note, body, bPrev, bToday, bNext });
    const redraw = () => { api.save(); this.render(api.board, api); };
    bCal.addEventListener("click", () => { st.mode = "calendar"; redraw(); });
    bWf.addEventListener("click", () => { st.mode = "waterfall"; redraw(); });
    bPrev.addEventListener("click", () => { const m = TL.shiftMonth(st.year, st.month, -1); st.year = m.year; st.month = m.month; redraw(); });
    bNext.addEventListener("click", () => { const m = TL.shiftMonth(st.year, st.month, 1); st.year = m.year; st.month = m.month; redraw(); });
    bToday.addEventListener("click", () => {
      const n = TL.todayFrom(new Date());
      const p = new Date(n * 86400000);
      st.year = p.getUTCFullYear(); st.month = p.getUTCMonth();
      st.scrollToToday = true;
      redraw();
    });
  },
  render(board, api) {
    const st = api.state;
    const cal = st.mode === "calendar";
    this.bCal.setAttribute("aria-pressed", cal ? "true" : "false");
    this.bWf.setAttribute("aria-pressed", cal ? "false" : "true");
    for (const z of TL.ZOOMS) this.zbtn[z].setAttribute("aria-pressed", st.zoom === z ? "true" : "false");
    this.bPrev.hidden = this.bNext.hidden = this.label.hidden = !cal;
    this.zoom.hidden = cal;
    this.body.replaceChildren();
    if (!board) return;
    const tasks = [];
    for (const c of board.columns) for (const t of c.tasks) tasks.push(t);
    const today = TL.todayFrom(new Date());
    if (cal) {
      this.label.textContent = TL.monthLabel(st.year, st.month);
      const n = TL.countNoDue(tasks);
      this.note.textContent = "no due date: " + n;
      this.body.append(renderCalendar(board, tasks, st, today));
    } else {
      this.label.textContent = "";
      const lay = TL.layout(tasks, today, st.zoom);
      this.note.textContent = lay.unscheduled.length ? "no dates, not drawn: " + lay.unscheduled.length : "";
      const chart = renderWaterfall(board, lay, today);
      this.body.append(chart.node);
      if (st.scrollToToday || st.fresh !== false) {
        st.scrollToToday = false; st.fresh = false;
        chart.node.scrollLeft = Math.max(0, lay.todayX - chart.node.clientWidth / 3);
      }
    }
  },
});

function renderCalendar(board, tasks, st, today) {
  const wrap = GITASK.el("div", "tl-cal");
  wrap.setAttribute("role", "grid");
  wrap.setAttribute("aria-label", TL.monthLabel(st.year, st.month));
  const head = GITASK.el("div", "tl-cal-row tl-cal-head");
  for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) head.append(GITASK.el("div", "tl-cal-dow", d));
  wrap.append(head);
  const by = TL.dueByDay(tasks);
  for (const week of TL.monthGrid(st.year, st.month, today)) {
    const row = GITASK.el("div", "tl-cal-row");
    row.setAttribute("role", "row");
    for (const cell of week) {
      const c = GITASK.el("div", "tl-cell" + (cell.inMonth ? "" : " out") + (cell.isToday ? " today" : ""));
      c.setAttribute("role", "gridcell");
      c.append(GITASK.el("div", "tl-daynum", String(Number(cell.iso.slice(8)))));
      for (const t of by[cell.day] || []) {
        const sp = TL.taskSpan(t, today);
        const chip = GITASK.el("button", "tl-chip" + (sp && sp.overdue ? " overdue" : "") + (sp && sp.done ? " done" : ""), t.title);
        const status = statusOf(board, t.column);
        chip.title = t.title + " (" + status + ", due " + cell.iso + (sp && sp.overdue ? ", overdue" : "") + ")";
        chip.setAttribute("aria-label", t.title + ", " + status + ", due " + cell.iso + (sp && sp.overdue ? ", overdue" : ""));
        const chipCol = board.columns[columnIndex(board, t.column)];
        if (chipCol && chipCol.color) chip.style.setProperty("border-left", "4px solid " + chipCol.color);
        activate(chip, t.path);
        c.append(chip);
      }
      row.append(c);
    }
    wrap.append(row);
  }
  return wrap;
}

function renderWaterfall(board, lay, today) {
  const scroll = GITASK.el("div", "tl-scroll");
  if (!lay.bars.length) {
    scroll.append(GITASK.el("div", "tl-empty", "No tasks with dates to draw."));
    return { node: scroll };
  }
  const NAME_W = 200;
  const grid = GITASK.el("div", "tl-grid");
  const names = GITASK.el("div", "tl-names");
  names.style.width = NAME_W + "px";
  const nh = GITASK.el("div", "tl-names-head", "Task");
  nh.style.height = lay.headH + "px";
  names.append(nh);
  for (const b of lay.bars) {
    const n = GITASK.el("div", "tl-name" + (b.span.overdue ? " overdue" : ""), b.title);
    n.style.height = lay.rowH + "px";
    n.title = b.title;
    names.append(n);
  }
  const chart = GITASK.el("div", "tl-chart");
  chart.style.width = lay.width + "px";
  const H = lay.height;
  // Axis stays at the top while rows scroll vertically.
  const axis = svg("svg", { width: lay.width, height: lay.headH, class: "tl-axis", role: "presentation" });
  for (const t of lay.ticks) {
    axis.append(svg("line", { x1: t.x, x2: t.x, y1: t.major ? 4 : lay.headH - 12, y2: lay.headH, class: "tl-tick" + (t.major ? " major" : "") }));
    axis.append(svg("text", { x: t.x + 3, y: t.major ? 16 : lay.headH - 16, class: "tl-ticklabel" }, t.label));
  }
  const body = svg("svg", { width: lay.width, height: H - lay.headH, class: "tl-svg", role: "list", "aria-label": "Task bars" });
  const off = lay.headH;
  const defs = svg("defs");
  const marker = svg("marker", { id: "tl-arrow", markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: "auto" });
  marker.append(svg("path", { d: "M0 0 L8 4 L0 8 z", class: "tl-arrowhead" }));
  defs.append(marker);
  body.append(defs);
  for (const t of lay.ticks) if (t.major) body.append(svg("line", { x1: t.x, x2: t.x, y1: 0, y2: H, class: "tl-grid-line" }));
  const rowsG = svg("g");
  for (const b of lay.bars) {
    if (b.row % 2 === 1) rowsG.append(svg("rect", { x: 0, y: b.row * lay.rowH, width: lay.width, height: lay.rowH, class: "tl-zebra" }));
  }
  body.append(rowsG);
  // Edges sit under the bars. Their paths use full-chart coordinates (axis height included), so shift them up.
  const edgesG = svg("g", { class: "tl-edges", "aria-hidden": "true" });
  for (const e of lay.edges) {
    const p = svg("path", { d: e.d, class: "tl-edge", "marker-end": "url(#tl-arrow)" });
    edgesG.append(p);
  }
  edgesG.setAttribute("transform", "translate(0 -" + off + ")");
  body.append(edgesG);
  for (const b of lay.bars) {
    const status = statusOf(board, b.column);
    const sp = b.span;
    const y = b.row * lay.rowH;
    const g = svg("g", { class: "tl-barg", tabindex: 0, role: "listitem" });
    const desc = b.title + ", " + status + ", " + TL.formatDate(sp.start) + " to " + (sp.hasDue ? TL.formatDate(sp.end) + " due" : sp.done ? TL.formatDate(sp.end) + " last updated" : "today, no due date") + (sp.overdue ? ", overdue" : "") + (sp.dueBeforeStart ? ", due date is before start" : "");
    g.setAttribute("aria-label", desc);
    g.append(svg("title", null, desc));
    const cls = "tl-rect st-" + (columnIndex(board, b.column) % 6) + (sp.openEnded ? " open" : "") + (sp.overdue ? " overdue" : "") + (sp.dueBeforeStart ? " invalid" : "");
    const rect = svg("rect", { x: b.x, y: y + 6, width: b.w, height: lay.rowH - 12, rx: 3, class: cls });
    const stCol = board.columns[columnIndex(board, b.column)];
    if (stCol && stCol.color) rect.style.setProperty("fill", stCol.color);
    g.append(rect);
    let text = status;
    if (sp.overdue) text += " - OVERDUE";
    if (sp.dueBeforeStart) text += " - due before start";
    if (sp.openEnded) text += sp.done ? " - no due date" : " - no due date, open";
    g.append(svg("text", { x: b.x + b.w + 6, y: y + lay.rowH / 2 + 4, class: "tl-bartext" + (sp.overdue ? " overdue" : "") }, text));
    activate(g, b.path);
    body.append(g);
  }
  body.append(svg("line", { x1: lay.todayX, x2: lay.todayX, y1: 0, y2: H, class: "tl-today" }));
  axis.append(svg("line", { x1: lay.todayX, x2: lay.todayX, y1: 0, y2: lay.headH, class: "tl-today" }));
  axis.append(svg("text", { x: lay.todayX + 3, y: lay.headH - 3, class: "tl-todaylabel" }, "today"));
  chart.append(axis, body);
  grid.append(names, chart);
  scroll.append(grid);
  return { node: scroll };
}
`;

const css = `
.view-timeline { --tl-line: var(--vscode-panel-border, #8884); }
.view-timeline .tl-bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin-bottom: 8px; }
.view-timeline .tl-group { display: flex; gap: 4px; align-items: center; }
.view-timeline .tl-toggle[aria-pressed="true"] { background: var(--vscode-button-secondaryBackground, var(--vscode-toolbar-hoverBackground)); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); outline: 1px solid var(--vscode-focusBorder); }
.view-timeline .tl-label { margin-left: 8px; min-width: 130px; }
.view-timeline [hidden] { display: none !important; }
.view-timeline .tl-note { font-size: 12px; opacity: .8; margin-bottom: 8px; min-height: 1em; }
.view-timeline .tl-empty { opacity: .7; padding: 16px 4px; }
.view-timeline .tl-cal { border: 1px solid var(--tl-line); border-radius: 4px; overflow: hidden; }
.view-timeline .tl-cal-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.view-timeline .tl-cal-dow { padding: 4px 6px; font-size: 11px; text-transform: uppercase; opacity: .75; background: var(--vscode-sideBar-background); }
.view-timeline .tl-cell { min-height: 84px; padding: 3px; border-top: 1px solid var(--tl-line); border-left: 1px solid var(--tl-line); display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.view-timeline .tl-cell:nth-child(7n + 1) { border-left: 0; }
.view-timeline .tl-cell.out { opacity: .5; background: var(--vscode-sideBar-background); }
.view-timeline .tl-cell.today { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; }
.view-timeline .tl-daynum { font-size: 11px; opacity: .8; }
.view-timeline .tl-cell.today .tl-daynum { font-weight: 700; opacity: 1; }
.view-timeline .tl-chip { text-align: left; font-size: 11px; padding: 1px 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 3px; }
.view-timeline .tl-chip.done { text-decoration: line-through; opacity: .7; }
.view-timeline .tl-chip.overdue { background: var(--vscode-inputValidation-errorBackground, var(--vscode-errorForeground)); color: var(--vscode-foreground); border: 1px solid var(--vscode-errorForeground); }
.view-timeline .tl-chip.overdue::before { content: "! "; font-weight: 700; }
.view-timeline .tl-scroll { overflow: auto; max-height: calc(100vh - 150px); border: 1px solid var(--tl-line); border-radius: 4px; }
.view-timeline .tl-grid { display: flex; width: max-content; min-width: 100%; }
.view-timeline .tl-names { position: sticky; left: 0; z-index: 3; flex: none; background: var(--vscode-editor-background); border-right: 1px solid var(--tl-line); }
.view-timeline .tl-names-head { position: sticky; top: 0; z-index: 4; box-sizing: border-box; padding: 20px 8px 0; font-size: 11px; text-transform: uppercase; opacity: .75; background: var(--vscode-editor-background); border-bottom: 1px solid var(--tl-line); }
.view-timeline .tl-name { box-sizing: border-box; padding: 0 8px; line-height: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
.view-timeline .tl-name.overdue { color: var(--vscode-errorForeground); }
.view-timeline .tl-chart { flex: none; position: relative; }
.view-timeline .tl-axis { position: sticky; top: 0; z-index: 2; display: block; background: var(--vscode-editor-background); border-bottom: 1px solid var(--tl-line); }
.view-timeline .tl-svg { display: block; }
.view-timeline .tl-tick { stroke: var(--tl-line); }
.view-timeline .tl-tick.major { stroke: var(--vscode-foreground); opacity: .5; }
.view-timeline .tl-ticklabel { font-size: 10px; fill: var(--vscode-foreground); opacity: .8; }
.view-timeline .tl-grid-line { stroke: var(--tl-line); }
.view-timeline .tl-zebra { fill: var(--vscode-sideBar-background); opacity: .6; }
.view-timeline .tl-today { stroke: var(--vscode-charts-red, var(--vscode-errorForeground)); stroke-width: 2; }
.view-timeline .tl-todaylabel { font-size: 10px; font-weight: 700; fill: var(--vscode-charts-red, var(--vscode-errorForeground)); }
.view-timeline .tl-edge { fill: none; stroke: var(--vscode-foreground); opacity: .55; stroke-width: 1.2; }
.view-timeline .tl-arrowhead { fill: var(--vscode-foreground); opacity: .7; }
.view-timeline .tl-barg { cursor: pointer; outline: none; }
.view-timeline .tl-barg:focus-visible .tl-rect, .view-timeline .tl-barg:hover .tl-rect { stroke: var(--vscode-focusBorder); stroke-width: 2; }
.view-timeline .tl-rect { stroke: var(--vscode-contrastBorder, transparent); }
.view-timeline .tl-rect.st-0 { fill: var(--vscode-charts-blue, #3794ff); }
.view-timeline .tl-rect.st-1 { fill: var(--vscode-charts-purple, #b180d7); }
.view-timeline .tl-rect.st-2 { fill: var(--vscode-charts-yellow, #cca700); }
.view-timeline .tl-rect.st-3 { fill: var(--vscode-charts-orange, #d18616); }
.view-timeline .tl-rect.st-4 { fill: var(--vscode-charts-green, #89d185); }
.view-timeline .tl-rect.st-5 { fill: var(--vscode-charts-foreground, #888); }
.view-timeline .tl-rect.open { fill-opacity: .4; stroke: var(--vscode-foreground); stroke-dasharray: 5 3; stroke-width: 1.5; }
.view-timeline .tl-rect.overdue { stroke: var(--vscode-errorForeground); stroke-width: 2.5; }
.view-timeline .tl-rect.invalid { stroke: var(--vscode-editorWarning-foreground, #cca700); stroke-dasharray: 2 2; stroke-width: 2; }
.view-timeline .tl-bartext { font-size: 11px; fill: var(--vscode-foreground); }
.view-timeline .tl-bartext.overdue { fill: var(--vscode-errorForeground); font-weight: 700; }
`;

// The shipped script embeds the very function the unit tests run.
export const js = "const TL = (" + timelineLogic.toString() + ")();\n" + client;

const timeline: ViewDef = { id: "timeline", label: "Timeline", js, css };
export default timeline;
