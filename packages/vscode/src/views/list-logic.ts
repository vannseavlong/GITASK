// Pure sort / filter / search logic for the List view. No `vscode` import.
// LOGIC_SRC is plain JS (no backticks, no dollar-brace) and is embedded verbatim in the webview
// by list.ts; tests evaluate the very same string, so the tested code is the shipped code.

export const LOGIC_SRC = String.raw`
var LIST_COLUMNS = [
  { key: "displayId", label: "ID", type: "text" },
  { key: "title", label: "Title", type: "text" },
  { key: "status", label: "Status", type: "text" },
  { key: "tier", label: "Tier", type: "text" },
  { key: "owner", label: "Owner", type: "text" },
  { key: "claimedBy", label: "Claimed by", type: "text" },
  { key: "updated", label: "Updated", type: "date" },
  { key: "due", label: "Due", type: "date" },
  { key: "progress", label: "Progress", type: "number" }
];

function listDate(v) {
  if (typeof v !== "string") return "";
  var m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(v);
  if (!m) return "";
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return "";
  return m[1] + "-" + m[2] + "-" + m[3];
}

function listUpdated(task) {
  var raw = task && task.fields && task.fields["started / updated"];
  if (typeof raw !== "string") return "";
  var parts = raw.split("/");
  return parts.length > 1 ? listDate(parts[parts.length - 1]) : "";
}

function listClean(v) {
  if (typeof v !== "string") return "";
  var s = v.trim();
  return s.toLowerCase() === "none" ? "" : s;
}

function listRows(board) {
  var rows = [];
  var cols = (board && board.columns) || [];
  for (var c = 0; c < cols.length; c++) {
    var tasks = cols[c].tasks || [];
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var total = t.progress && t.progress.total > 0 ? t.progress.total : 0;
      var done = total ? t.progress.done : 0;
      rows.push({
        task: t, path: t.path, id: t.id || "", displayId: t.displayId || "", title: t.title || t.id || "",
        status: cols[c].label || "", tier: listClean(t.tier), owner: listClean(t.owner),
        claimedBy: listClean(t.claimedBy), updated: listUpdated(t), due: listDate(t.due),
        done: done, total: total, progress: total ? done / total : null,
        index: rows.length
      });
    }
  }
  return rows;
}

function listEmpty(v) { return v === "" || v === null || v === undefined; }

function listSort(rows, key, dir) {
  if (dir !== "asc" && dir !== "desc") return rows.slice().sort(function (a, b) { return a.index - b.index; });
  var sign = dir === "desc" ? -1 : 1;
  return rows.slice().sort(function (a, b) {
    var x = a[key], y = b[key];
    var ex = listEmpty(x), ey = listEmpty(y);
    if (ex || ey) return ex && ey ? a.index - b.index : ex ? 1 : -1;
    var r;
    if (typeof x === "number") r = x - y;
    else { x = String(x).toLowerCase(); y = String(y).toLowerCase(); r = x < y ? -1 : x > y ? 1 : 0; }
    return r === 0 ? a.index - b.index : r * sign;
  });
}

function listFilter(rows, f) {
  f = f || {};
  var q = (f.q || "").trim().toLowerCase();
  return rows.filter(function (r) {
    if (f.status && r.status !== f.status) return false;
    if (f.tier && r.tier !== f.tier) return false;
    if (f.owner && r.owner !== f.owner) return false;
    if (q && (r.title + " " + r.id + " " + r.displayId + " " + r.owner).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

function listOptions(rows, key) {
  var seen = {}, out = [];
  for (var i = 0; i < rows.length; i++) {
    var v = rows[i][key];
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  }
  return out.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; });
}

function listView(board, st) {
  var all = listRows(board);
  var shown = listSort(listFilter(all, st), st.sort, st.dir);
  return { all: all, shown: shown };
}
`;

export interface ListRow {
  task: { path: string; id: string };
  path: string; id: string; displayId: string; title: string; status: string; tier: string; owner: string; claimedBy: string;
  updated: string; due: string; done: number; total: number; progress: number | null; index: number;
}
export interface ListFilter { status?: string; tier?: string; owner?: string; q?: string }
export interface ListLogic {
  LIST_COLUMNS: { key: string; label: string; type: string }[];
  listRows(board: unknown): ListRow[];
  listSort(rows: ListRow[], key: string, dir: string): ListRow[];
  listFilter(rows: ListRow[], f: ListFilter): ListRow[];
  listOptions(rows: ListRow[], key: string): string[];
  listView(board: unknown, st: ListFilter & { sort?: string; dir?: string }): { all: ListRow[]; shown: ListRow[] };
}

/** The shipped logic, evaluated for tests and typed callers. */
export const logic: ListLogic = new Function(
  LOGIC_SRC + "; return { LIST_COLUMNS: LIST_COLUMNS, listRows: listRows, listSort: listSort, listFilter: listFilter, listOptions: listOptions, listView: listView };",
)();
