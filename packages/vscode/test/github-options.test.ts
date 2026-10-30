import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOptions } from "../src/github-plan.ts";

test("gitask.autoCommit reaches applySync: off means no commit, default is on", () => {
  assert.deepEqual(applyOptions(false), { commit: false });
  assert.deepEqual(applyOptions(true), { commit: true });
  assert.deepEqual(applyOptions(undefined), { commit: true });
});
