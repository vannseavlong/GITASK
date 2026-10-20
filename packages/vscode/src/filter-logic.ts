// Pure date-range filter shared by every view. No `vscode` import.
// FILTER_SRC is plain JS (no backticks, no dollar-brace); html.ts embeds it verbatim in the webview
// shell and tests evaluate the very same string, so the tested code is the shipped code.

export const FILTER_SRC = String.raw`
var RANGE_FIELDS = ["due", "updated"];

function rangeDate(v) {
  if (typeof v !== "string") return "";
  var m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(v);
  if (!m) return "";
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return "";
  return m[1] + "-" + m[2] + "-" + m[3];
}

// Clean a saved or typed range: bad dates become open ends, unknown field becomes "due".
function rangeNorm(r) {
  r = r || {};
  return { from: rangeDate(r.from), to: rangeDate(r.to), field: r.field === "updated" ? "updated" : "due" };
}

function rangeActive(r) {
  var n = rangeNorm(r);
  return !!(n.from || n.to);
}

// The date a task is filtered on: Due, or the second date of "Started / updated". "" when missing or invalid.
function taskDate(task, field) {
  if (!task) return "";
  if (field === "updated") {
    var raw = task.fields && task.fields["started / updated"];
    if (typeof raw !== "string") return "";
    var parts = raw.split("/");
    return parts.length > 1 ? rangeDate(parts[parts.length - 1]) : "";
  }
  return rangeDate(task.due);
}

// Inclusive on both ends; an empty end is open. Without an active range every task passes;
// with one, a task without a usable date does not.
function inRange(task, r) {
  var n = rangeNorm(r);
  if (!n.from && !n.to) return true;
  var d = taskDate(task, n.field);
  if (!d) return false;
  if (n.from && d < n.from) return false;
  if (n.to && d > n.to) return false;
  return true;
}

// A copy of the board whose columns keep only tasks in range. Same object back when no range is active.
function filterBoard(board, r) {
  if (!board || !rangeActive(r)) return board;
  var out = {};
  for (var k in board) out[k] = board[k];
  out.columns = (board.columns || []).map(function (c) {
    var o = {};
    for (var k2 in c) o[k2] = c[k2];
    o.tasks = (c.tasks || []).filter(function (t) { return inRange(t, r); });
    return o;
  });
  return out;
}

function countTasks(board) {
  var n = 0;
  var cols = (board && board.columns) || [];
  for (var i = 0; i < cols.length; i++) n += (cols[i].tasks || []).length;
  return n;
}
`;

export interface DateRange { from?: string; to?: string; field?: string }
export interface RangeTask { due?: string; fields?: Record<string, string> }
export interface FilterLogic {
  rangeDate(v: unknown): string;
  rangeNorm(r?: DateRange | null): { from: string; to: string; field: "due" | "updated" };
  rangeActive(r?: DateRange | null): boolean;
  taskDate(task: RangeTask | null | undefined, field: string): string;
  inRange(task: RangeTask | null | undefined, r?: DateRange | null): boolean;
  filterBoard<B>(board: B, r?: DateRange | null): B;
  countTasks(board: unknown): number;
}

/** The shipped logic, evaluated for tests and typed callers. */
export const filterLogic: FilterLogic = new Function(
  FILTER_SRC + "; return { rangeDate: rangeDate, rangeNorm: rangeNorm, rangeActive: rangeActive, taskDate: taskDate, inRange: inRange, filterBoard: filterBoard, countTasks: countTasks };",
)();
