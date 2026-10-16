import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTaskBody, MAX_TASK_BYTES } from "../src/taskfile.ts";

test("readTaskBody reads files, refuses symlinks, directories, huge and missing files", async () => {
  const d = mkdtempSync(join(tmpdir(), "gitask-tf-"));
  writeFileSync(join(d, "a.md"), "# hi\n");
  writeFileSync(join(d, "big.md"), "x".repeat(MAX_TASK_BYTES + 1));
  symlinkSync(join(d, "a.md"), join(d, "link.md"));
  mkdirSync(join(d, "dir.md"));
  assert.deepEqual(await readTaskBody(join(d, "a.md")), { text: "# hi\n" });
  for (const f of ["big.md", "link.md", "dir.md", "missing.md"]) assert.ok("error" in (await readTaskBody(join(d, f))), f);
});
