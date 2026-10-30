import { test } from "node:test";
import assert from "node:assert/strict";
import { serialQueue } from "../src/index.ts";

test("serialQueue runs jobs one at a time in order and survives a failing job", async () => {
  const run = serialQueue();
  const log: string[] = [];
  let active = 0;
  const job = (name: string, ms: number, fail = false) => () =>
    (async () => {
      assert.equal(++active, 1, "two jobs ran at once");
      log.push(`start ${name}`);
      await new Promise((r) => setTimeout(r, ms));
      log.push(`end ${name}`);
      active--;
      if (fail) throw new Error(name);
      return name;
    })();
  const results = await Promise.allSettled([run(job("a", 20)), run(job("b", 1, true)), run(job("c", 1))]);
  assert.deepEqual(results.map((r) => r.status), ["fulfilled", "rejected", "fulfilled"]);
  assert.deepEqual(log, ["start a", "end a", "start b", "end b", "start c", "end c"]);
});
