import { test } from "node:test";
import assert from "node:assert/strict";
import { readyToOpen } from "../../ui/src/detail/pending-open.ts";

const board = { columns: [{ id: "1-backlog", tasks: [{ path: "/w/Tasks/1-backlog/A.md" }] }] } as never;

test("readyToOpen waits for the board to hold the created task", () => {
  assert.equal(readyToOpen(null, "/w/Tasks/1-backlog/A.md"), null);
  assert.equal(readyToOpen(board, null), null);
  assert.equal(readyToOpen(board, "/w/Tasks/1-backlog/B.md"), null);
  assert.equal(readyToOpen(board, "/w/Tasks/1-backlog/A.md"), "/w/Tasks/1-backlog/A.md");
});
