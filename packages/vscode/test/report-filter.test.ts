import { test } from "node:test";
import assert from "node:assert/strict";
import { inReportRange, reportDate } from "gitask-core";
import { filterLogic } from "../src/filter-logic.ts";

// The report must filter exactly like the board: same rule, checked over a matrix of ranges and dates.
test("inReportRange agrees with the board filter's inRange", () => {
  const ends = ["", "2026-01-10", "2026-02-30", "garbage", "2026-03-01"];
  const dates = ["", "2026-01-09", "2026-01-10", "2026-02-15", "2026-03-01", "2026-03-02", "not-a-date"];
  for (const from of ends) {
    for (const to of ends) {
      for (const d of dates) {
        const task = { due: d, fields: { "started / updated": `2026-01-01 / ${d}` } };
        for (const field of ["due", "updated"]) {
          assert.equal(inReportRange(reportDate(d), from, to), filterLogic.inRange(task, { from, to, field }), `${field} ${from}..${to} ${d}`);
        }
      }
    }
  }
});
