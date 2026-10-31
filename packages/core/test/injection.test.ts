import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, escapeMd, planSync, renderMarkdown, parseTask } from "../src/index.ts";
import type { Board } from "../src/index.ts";

test("github issue body: a hostile file name cannot end the code span, break the link, ping anyone or close the marker", () => {
  const name = "x`](https://evil.example/)@everyone <img src=x> -->(a)[b].md";
  const path = `/r/Tasks/2-todo/${name}`;
  const t = parseTask(path, "2-todo", "# T\n\n- **Owner:** Sam\n");
  const board: Board = { dir: "/r/Tasks", columns: [{ id: "2-todo", label: "todo", tasks: [t] }] };
  const body = planSync(board, { repo: "acme/app" }, []).issues[0].body;
  const link = /^Tracked in GITASK: \[([^\]]*)\]\((https:\/\/github\.com\/acme\/app\/blob\/HEAD\/[^)\s]*)\)\n\n<!-- gitask:([\w.-]*) -->$/.exec(body);
  assert.ok(link, body);
  assert.ok(!/[`@<>()]/.test(link![1]), link![1]);
  assert.ok(!/[()<>`@ ]/.test(link![2]), link![2]);
  assert.ok(!body.includes("evil.example/)") && !body.includes("<img"));
  assert.equal(body.split("-->").length, 2); // only the marker's own terminator
});

test("escapeMd neutralises @mentions and bare URLs but keeps the text readable", () => {
  const out = escapeMd("ping @octocat see https://evil.example/x and www.evil.example");
  assert.ok(!/@[A-Za-z]/.test(out), out);
  assert.ok(!/https?:\/\//.test(out) && !/www\./.test(out), out);
  assert.equal(out.replaceAll("​", ""), "ping @octocat see https://evil.example/x and www.evil.example".replace(/[\\`*_{}[\]<>()#+!|~&]/g, "\\$&"));
});

test("markdown report: hostile titles and sub-task text have no live mention, link or email", async () => {
  const raw = "# Fix @everyone https://evil.example/p mail bob@example.com <b>\n\n- **Owner:** Sam\n- **Started / updated:** 2026-01-01 / 2026-01-05\n\n## Sub-tasks\n- [x] ask carol@example.com or Dana <dana@corp.io> about @octocat www.evil.example\n";
  const t = parseTask("/r/Tasks/5-done/A.md", "5-done", raw);
  const board: Board = { dir: "/r/Tasks", columns: [{ id: "5-done", label: "done", tasks: [t] }] };
  const md = renderMarkdown(await buildReport(board, { people: [], includeSubtasks: true, dateField: "updated" } as never));
  assert.ok(!/@example\.com|@corp\.io/.test(md), md);
  assert.ok(!/@[A-Za-z]/.test(md), md);
  assert.ok(!/https?:\/\/|www\./.test(md), md);
  assert.ok(md.includes("email") && md.includes("ask") && md.includes("about"), md);
});
