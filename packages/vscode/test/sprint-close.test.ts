import { test } from "node:test";
import assert from "node:assert/strict";
import { applyToAll, confirmBlocker, knownActions, pointsText, resetTarget, successLines, summaryTiles, withAction } from "../../ui/src/lib/sprint-close.ts";

const plan = { next: "S2", unfinished: [{ path: "/T/2-todo/a.md", estimate: 3 }, { path: "/T/3-in-progress/b.md" }], blockers: [] as string[] };
const summary = { committed: { tasks: 3, points: 8 }, done: { tasks: 1, points: 5 }, toBacklog: ["T-0002"], toNext: ["T-0003"] };

test("resetTarget: config column, else 2-todo, never a done status, else none", () => {
  assert.equal(resetTarget("3-review", ["2-todo", "3-review"]), "3-review");
  assert.equal(resetTarget("9-gone", ["2-todo"]), "2-todo");
  assert.equal(resetTarget(null, ["2-todo"]), "2-todo");
  assert.equal(resetTarget("5-done", ["2-todo", "5-done"], ["5-done"]), "2-todo");
  assert.equal(resetTarget(null, ["1-backlog"]), undefined);
});

test("applyToAll, withAction and knownActions", () => {
  assert.deepEqual(applyToAll(plan, "next"), { "/T/2-todo/a.md": "next", "/T/3-in-progress/b.md": "next" });
  const cur = { "/T/2-todo/a.md": "backlog" as const, "/T/3-in-progress/b.md": "backlog" as const };
  assert.deepEqual(withAction(cur, "/T/2-todo/a.md", "next"), { "/T/2-todo/a.md": "next", "/T/3-in-progress/b.md": "backlog" });
  assert.equal(cur["/T/2-todo/a.md"], "backlog"); // not mutated
  assert.deepEqual(knownActions({ "/T/2-todo/a.md": "next", "/T/5-done/c.md": "backlog" }, plan), { actions: { "/T/2-todo/a.md": "next" }, dropped: 1 });
});

test("summary tiles, points and success lines", () => {
  assert.deepEqual(summaryTiles(summary, "pts").map((t) => [t.label, t.value]), [["Done", "1"], ["Unfinished", "2"], ["Points", "5/8"]]);
  assert.deepEqual(summaryTiles(summary, "h").map((t) => t.label), ["Done", "Unfinished", "Hours"]);
  assert.equal(summaryTiles(summary, undefined).length, 2);
  assert.equal(pointsText(1.25, "pts"), "1.25 pts");
  assert.equal(pointsText(0.1 + 0.2, "h"), "0.3 h");
  assert.equal(pointsText(3, undefined), "");
  assert.deepEqual(successLines("S1", summary, "S2", "pts"), ["S1 is closed.", "Committed: 3 tasks · 8 pts · Done: 1 · 5 pts", "To backlog: T-0002", "To S2: T-0003"]);
  assert.deepEqual(successLines("S1", { ...summary, toBacklog: [], toNext: [] }, "S2", undefined).slice(1), ["Committed: 3 tasks · Done: 1", "To backlog: none", "To S2: none"]);
});

test("confirmBlocker: applying, planning, blockers, else free", () => {
  assert.equal(confirmBlocker({ planning: false, applying: true, hasPlan: true, blockers: [] }), "Completing…");
  assert.equal(confirmBlocker({ planning: true, applying: false, hasPlan: true, blockers: [] }), "Updating the plan…");
  assert.equal(confirmBlocker({ planning: false, applying: false, hasPlan: false, blockers: [] }), "Updating the plan…");
  assert.equal(confirmBlocker({ planning: false, applying: false, hasPlan: true, blockers: ["x", "y"] }), "Cannot complete: x (and 1 more)");
  assert.equal(confirmBlocker({ planning: false, applying: false, hasPlan: true, blockers: [] }), undefined);
});
