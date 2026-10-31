import { test } from "node:test";
import assert from "node:assert/strict";
import { hideSubtaskSection } from "../src/body-logic.ts";

const BODY = `# T

## Goal
- [ ] goal box

## Sub-tasks
- [ ] first @ann
- [x] second

\`\`\`
- [ ] in a fence
\`\`\`

## Done when
- [ ] keep me
- [x] keep me too
`;

test("hides only the Sub-tasks section checkboxes, keeps line numbers", () => {
  const out = hideSubtaskSection(BODY);
  assert.ok(!out.includes("first @ann") && !out.includes("second") && !out.includes("in a fence") && !out.includes("## Sub-tasks"));
  assert.ok(out.includes("goal box") && out.includes("keep me") && out.includes("keep me too"));
  assert.equal(out.split("\n").length, BODY.split("\n").length); // lines blanked, never removed
  assert.equal(out.split("\n")[BODY.split("\n").indexOf("- [ ] keep me")], "- [ ] keep me");
});

test("no Sub-tasks section: unchanged; also matches 'Subtasks' and CRLF", () => {
  assert.equal(hideSubtaskSection("## Done when\n- [ ] a\n"), "## Done when\n- [ ] a\n");
  assert.ok(!hideSubtaskSection("## Subtasks\r\n- [ ] gone\r\n## Other\r\n- [ ] stays\r\n").includes("gone"));
  assert.ok(hideSubtaskSection("## Subtasks\r\n- [ ] gone\r\n## Other\r\n- [ ] stays\r\n").includes("stays"));
});
