import { test } from "node:test";
import assert from "node:assert/strict";
import { UNASSIGNED, filterPeople, initials, matchesPeople, ownerIs, personOf } from "../src/people-filter.ts";
import { filterLogic } from "../src/filter-logic.ts";

const people = [{ id: "sam-lee", name: "Sam Lee", github: "samlee" }, { id: "ann-roe", name: "Ann Roe" }];
const t = (id: string, owner?: string, extra: Record<string, unknown> = {}) => ({ id, owner, ...extra });
const board = { columns: [{ id: "a", tasks: [t("1", "Sam Lee"), t("2", "samlee"), t("3", "ann"), t("4"), t("5", "Zed")] }] };
const ids = (b: typeof board) => b.columns[0].tasks.map((x) => x.id);

test("owner text matches a person by name, id slug or github login, ignoring case", () => {
  assert.equal(ownerIs("SAM LEE", people[0]), true);
  assert.equal(ownerIs("sam-lee", people[0]), true);
  assert.equal(ownerIs("SamLee", people[0]), true);
  assert.equal(ownerIs("Ann", people[0]), false);
  assert.equal(ownerIs(undefined, people[0]), false);
  assert.equal(personOf("Ann Roe", people)?.id, "ann-roe");
});

test("no selection passes everything; selection keeps only chosen people", () => {
  assert.equal(filterPeople(board, [], people), board);
  assert.equal(filterPeople(board, undefined, people), board);
  assert.deepEqual(ids(filterPeople(board, ["sam-lee"], people)), ["1", "2"]);
  assert.deepEqual(ids(filterPeople(board, ["sam-lee", "ann-roe"], people)), ["1", "2"]);
});

test("Unassigned selects tasks without an owner; unknown owners match by slug only", () => {
  assert.deepEqual(ids(filterPeople(board, [UNASSIGNED], people)), ["4"]);
  assert.deepEqual(ids(filterPeople(board, [UNASSIGNED, "zed"], people)), ["4", "5"]);
  assert.equal(matchesPeople(t("x", "  "), [UNASSIGNED], people), true);
});

test("combines with the date filter (existing rules) and does not mutate", () => {
  const b = { columns: [{ id: "a", tasks: [t("1", "Sam Lee", { due: "2026-10-10" }), t("2", "Sam Lee", { due: "2026-12-10" }), t("3", "Ann Roe", { due: "2026-10-10" })] }] };
  const dated = filterLogic.filterBoard(b, { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(filterPeople(dated, ["sam-lee"], people).columns[0].tasks.map((x) => x.id), ["1"]);
  assert.equal(b.columns[0].tasks.length, 3);
});

test("initials", () => {
  assert.equal(initials("Sam Lee"), "SL");
  assert.equal(initials("SNLRLONG"), "SN");
  assert.equal(initials("ann"), "AN");
  assert.equal(initials(""), "?");
});
