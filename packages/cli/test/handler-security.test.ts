import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHandler } from "../src/handler.ts";

test("handler rejects every path message that targets a symlinked task file", async () => {
  const root = mkdtempSync(join(tmpdir(), "gitask-hs-"));
  const tasks = join(root, "Tasks");
  for (const c of ["1-backlog", "2-todo"]) mkdirSync(join(tasks, c), { recursive: true });
  writeFileSync(join(root, "victim.md"), "# V\n\n- **Owner:** Sam\n");
  const link = join(tasks, "1-backlog", "evil.md");
  symlinkSync(join(root, "victim.md"), link);
  const h = createHandler({ dir: tasks, commit: false });
  for (const m of [
    { type: "move", path: link, to: "2-todo" },
    { type: "setOwner", path: link, person: null },
    { type: "addSubtask", path: link, text: "pwn" },
    { type: "open", path: link },
  ]) {
    const r = await h.handle(m);
    assert.equal(r.status, 400, m.type);
    assert.equal(r.changed, false);
  }
  assert.equal(readFileSync(join(root, "victim.md"), "utf8"), "# V\n\n- **Owner:** Sam\n");
  assert.ok(existsSync(link));
});
