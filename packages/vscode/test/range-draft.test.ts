import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDraft, clearDraft, discardDraft, formatRange, hasRange, openDraft } from "../../ui/src/lib/range-draft.ts";

test("draft is a copy and discard returns the committed range", () => {
  const c = { from: "2026-09-29", to: "2026-10-23" };
  const d = openDraft(c);
  d.to = "2026-12-01";
  assert.equal(c.to, "2026-10-23");
  assert.deepEqual(discardDraft(c), c);
});
test("clear empties the draft, apply commits it", () => {
  assert.equal(hasRange(clearDraft()), false);
  assert.deepEqual(applyDraft({ from: "2026-01-02", to: "2026-01-05" }), { from: "2026-01-02", to: "2026-01-05" });
  assert.deepEqual(applyDraft({ from: "", to: "" }), { from: "", to: "" });
});
test("apply orders a reversed range", () => {
  assert.deepEqual(applyDraft({ from: "2026-02-01", to: "2026-01-01" }), { from: "2026-01-01", to: "2026-02-01" });
});
test("formatRange", () => {
  assert.equal(formatRange({ from: "2026-09-29", to: "2026-10-23" }, "en-US"), "Sep 29, 2026 - Oct 23, 2026");
  assert.equal(formatRange({ from: "", to: "" }, "en-US"), "");
  assert.equal(formatRange({ from: "2026-09-29", to: "" }, "en-US"), "Sep 29, 2026 - …");
});
