// Task detail overlay: a shell-level side panel, not a tab. Exposes `GITASK.openDetail(absoluteTaskPath)`.
// Client-side source, inlined by html.ts after MARKDOWN_JS. Task text reaches the DOM only through
// textContent (via GITASK.el and the sanitizing renderer). No backticks or dollar-brace in the JS.

export const DETAIL_JS = String.raw`
(function () {
  const root = el("div", "detail-root");
  root.hidden = true;
  const backdrop = el("div", "detail-backdrop");
  const panel = el("section", "detail-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "detail-title");
  const head = el("div", "detail-head");
  const titleEl = el("h2", "detail-title", "");
  titleEl.id = "detail-title";
  const closeBtn = el("button", "detail-close", "Close");
  closeBtn.setAttribute("aria-label", "Close task detail");
  head.append(titleEl, closeBtn);
  const bar = el("div", "detail-bar");
  const fieldsEl = el("dl", "detail-fields");
  const bodyEl = el("div", "detail-body");
  panel.append(head, bar, fieldsEl, bodyEl);
  root.append(backdrop, panel);
  document.body.append(root);

  let open = null;       // { path, text, error }
  let lastFocus = null;
  let parsed = null;     // { path, text, sections }

  function findTask(path) {
    if (!board) return null;
    for (const c of board.columns) for (const t of c.tasks) if (t.path === path) return t;
    return null;
  }
  function findById(id) {
    if (!board) return null;
    for (const c of board.columns) for (const t of c.tasks) if (t.id === id || t.id + ".md" === id) return t;
    return null;
  }
  function setInert(on) {
    for (const n of [tabsEl, errEl, viewsEl]) { if (on) n.setAttribute("inert", ""); else n.removeAttribute("inert"); }
  }

  function field(label, value) {
    if (value === undefined || value === null || value === "" || String(value).toLowerCase() === "none") return null;
    const d = el("div", "detail-field");
    d.append(el("dt", "", label), el("dd", "", String(value)));
    return d;
  }

  function subtaskIndex(task, line, ord) {
    let n = 0;
    for (let i = 0; i < task.subtasks.length; i++) {
      if (task.subtasks[i].line === line) { if (n === ord) return i; n++; }
    }
    return -1;
  }

  function renderHeader(task) {
    titleEl.textContent = task.title;
    bar.replaceChildren();
    const openBtn = el("button", "", "Open file");
    openBtn.addEventListener("click", () => post({ type: "open", path: task.path }));
    bar.append(openBtn);
    const total = task.progress && task.progress.total > 0 ? task.progress : null;
    if (total) {
      const p = el("div", "detail-progress");
      p.title = total.done + " of " + total.total + " done";
      const track = el("span", "track");
      const fill = el("span", "fill");
      fill.style.width = Math.round((100 * total.done) / total.total) + "%";
      track.append(fill);
      p.append(track, el("span", "count", total.done + "/" + total.total + " done"));
      bar.append(p);
    }
    fieldsEl.replaceChildren();
    const f = task.fields || {};
    const rows = [
      field("Column", task.column),
      field("Owner", task.owner),
      field("Tier", task.tier),
      field("Claimed by", task.claimedBy),
      field("Started / updated", f["started / updated"]),
      field("Due", task.due),
    ];
    for (const r of rows) if (r) fieldsEl.append(r);
    if (task.dependsOn && task.dependsOn.length) {
      const d = el("div", "detail-field");
      d.append(el("dt", "", "Depends on"));
      const dd = el("dd", "detail-chips");
      for (const id of task.dependsOn) {
        const dep = findById(id);
        const chip = el("button", "chip", id);
        if (dep) chip.addEventListener("click", () => GITASK.openDetail(dep.path));
        else chip.disabled = true;
        dd.append(chip);
      }
      d.append(dd);
      fieldsEl.append(d);
    }
  }

  function renderBody(task) {
    const prevScroll = bodyEl.scrollTop;
    const active = document.activeElement;
    const focusKey = active && active.dataset ? active.dataset.key : undefined;
    bodyEl.replaceChildren();
    if (open.error) { bodyEl.append(el("p", "detail-msg", "Cannot show the task text: " + open.error)); return; }
    if (open.text === null) { bodyEl.append(el("p", "detail-msg", "Loading...")); return; }
    if (!parsed || parsed.path !== open.path || parsed.text !== open.text) {
      parsed = { path: open.path, text: open.text, doc: GITASK_MD.sections(GITASK_MD.parse(open.text)) };
    }
    const opts = {
      checkbox(c) {
        const idx = subtaskIndex(task, c.line, c.ord);
        const box = el("input", "md-check");
        box.type = "checkbox";
        if (idx < 0) { box.checked = c.checked; box.disabled = true; return box; }
        const st = task.subtasks[idx];
        box.checked = st.checked;
        box.dataset.key = "st" + idx;
        box.setAttribute("aria-label", st.text);
        box.addEventListener("change", () => {
          box.checked = st.checked; // stay on the true state until the refreshed board arrives
          post({ type: "toggleSubtask", path: task.path, index: idx, line: st.line });
        });
        return box;
      },
    };
    const doc = parsed.doc;
    const addSection = (title, blocks) => {
      if (!blocks.length) return;
      const s = el("section", "detail-section");
      if (title) s.append(el("h3", "detail-h", title));
      for (const n of GITASK_MD.renderBlocks(blocks, el, opts)) s.append(n);
      bodyEl.append(s);
    };
    addSection("", doc.preamble);
    for (const s of doc.sections) addSection(s.title, s.blocks);
    if (!bodyEl.childNodes.length) bodyEl.append(el("p", "detail-msg", "This task has no body."));
    bodyEl.scrollTop = prevScroll;
    if (focusKey) {
      const again = bodyEl.querySelector('[data-key="' + focusKey + '"]');
      if (again) again.focus();
    }
  }

  function renderAll() {
    if (!open) return;
    const task = findTask(open.path);
    if (!task) { close(); return; }
    renderHeader(task);
    renderBody(task);
  }

  function close() {
    if (!open) return;
    open = null;
    parsed = null;
    root.hidden = true;
    setInert(false);
    document.removeEventListener("keydown", onKey, true);
    const back = lastFocus;
    lastFocus = null;
    if (back && back.isConnected) back.focus();
  }

  function focusables() {
    return Array.from(panel.querySelectorAll("button:not([disabled]), a[href], input:not([disabled])"));
  }
  function onKey(ev) {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(); return; }
    if (ev.key !== "Tab") return;
    const f = focusables();
    if (!f.length) { ev.preventDefault(); return; }
    const first = f[0];
    const last = f[f.length - 1];
    if (!panel.contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
    else if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  GITASK.openDetail = function (path) {
    if (typeof path !== "string") return;
    const task = findTask(path);
    if (!task) return;
    const was = open;
    if (!was) {
      lastFocus = document.activeElement;
      root.hidden = false;
      setInert(true);
      document.addEventListener("keydown", onKey, true);
    }
    open = { path: path, text: was && was.path === path ? was.text : null, error: null };
    renderAll();
    bodyEl.scrollTop = 0;
    post({ type: "readTask", path: path });
    if (!was) closeBtn.focus();
  };

  // Host hooks called by the shell.
  GITASK.onHost = function (m) {
    if (m.type === "taskBody" && open && m.path === open.path) {
      open.text = typeof m.text === "string" ? m.text : null;
      open.error = typeof m.text === "string" ? null : String(m.error || "unreadable");
      renderAll();
    }
  };
  GITASK.onBoard = function () {
    if (!open) return;
    renderAll();
    if (open) post({ type: "readTask", path: open.path });
  };
})();
`;

export const DETAIL_CSS = `
.detail-root[hidden] { display: none; }
.detail-root { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: flex-end; }
.detail-backdrop { position: absolute; inset: 0; background: var(--vscode-editor-background); opacity: .55; }
.detail-panel { position: relative; width: min(680px, 100%); height: 100%; box-sizing: border-box; display: flex; flex-direction: column; background: var(--vscode-editor-background); color: var(--vscode-foreground); border-left: 1px solid var(--vscode-contrastBorder, var(--vscode-panel-border)); box-shadow: -4px 0 12px var(--vscode-widget-shadow, rgba(0,0,0,.3)); }
.detail-head { display: flex; gap: 8px; align-items: flex-start; padding: 12px 16px 8px; }
.detail-title { flex: 1; margin: 0; font-size: 16px; font-weight: 600; word-break: break-word; }
.detail-bar { display: flex; gap: 12px; align-items: center; padding: 0 16px 8px; flex-wrap: wrap; }
.detail-progress { display: flex; align-items: center; gap: 6px; font-size: 12px; flex: 1; min-width: 140px; }
.detail-progress .track { flex: 1; height: 5px; border-radius: 3px; background: var(--vscode-panel-border); overflow: hidden; display: block; }
.detail-progress .fill { display: block; height: 100%; background: var(--vscode-progressBar-background); }
.detail-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px 16px; margin: 0; padding: 8px 16px 12px; border-bottom: 1px solid var(--vscode-panel-border); font-size: 12px; }
.detail-field dt { opacity: .7; font-size: 11px; text-transform: uppercase; }
.detail-field dd { margin: 0; word-break: break-word; }
.detail-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.detail-panel button.chip { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; padding: 0 8px; font-size: 11px; }
.detail-body { flex: 1; min-height: 0; overflow: auto; padding: 8px 16px 24px; }
.detail-msg { opacity: .75; }
.detail-section { margin-bottom: 14px; }
.detail-h { margin: 12px 0 6px; font-size: 13px; text-transform: uppercase; opacity: .85; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 2px; }
.detail-body .md-p { margin: 4px 0; }
.detail-body .md-h { margin: 10px 0 4px; font-size: 13px; }
.detail-body .md-list { margin: 4px 0; padding-left: 22px; }
.detail-body .md-task { list-style: none; margin-left: -18px; }
.detail-body .md-check { margin: 0 6px 0 0; vertical-align: middle; }
.detail-body code { font-family: var(--vscode-editor-font-family); font-size: .95em; background: var(--vscode-textCodeBlock-background); padding: 0 3px; border-radius: 3px; }
.detail-body pre.md-pre { background: var(--vscode-textCodeBlock-background); padding: 8px; border-radius: 4px; overflow: auto; margin: 6px 0; }
.detail-body pre.md-pre code { background: none; padding: 0; }
.detail-body blockquote { margin: 6px 0; padding-left: 10px; border-left: 3px solid var(--vscode-panel-border); opacity: .9; }
.detail-body a { color: var(--vscode-textLink-foreground); }
.detail-body table.md-table { border-collapse: collapse; margin: 6px 0; font-size: 12px; }
.detail-body .md-table th, .detail-body .md-table td { border: 1px solid var(--vscode-panel-border); padding: 3px 8px; text-align: left; }
`;
