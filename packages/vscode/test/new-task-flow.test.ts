import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// extension.ts imports "vscode", so it cannot run under node:test; this guards the shape of newTask() in the source.
const src = readFileSync(new URL("../src/extension.ts", import.meta.url), "utf8");
const body = src.slice(src.indexOf("async function newTask("), src.indexOf("async function initTasksFolder"));

test("newTask stays on the board: reveals it and never opens the file directly", () => {
  assert.match(body, /openBoard\(ctx\)/);
  const beforeNotice = body.slice(0, body.indexOf("showInformationMessage"));
  assert.doesNotMatch(beforeNotice, /showTextDocument/);
});

test("newTask offers a non-modal, non-blocking Open file action", () => {
  assert.match(body, /showInformationMessage\(.*"Open file"\)/);
  assert.doesNotMatch(body, /await vscode\.window\.showInformationMessage/);
  assert.doesNotMatch(body, /modal:\s*true/);
});

test("newTask errors still show an error message", () => {
  assert.match(body, /showErrorMessage/);
});

test("newTask sends taskCreated after the board, only on success", () => {
  const i = body.indexOf("taskCreatedMessage");
  assert.ok(i > body.indexOf("await post()"), "sent after the board is posted");
  assert.ok(i < body.indexOf("catch"), "not sent from the error path");
});
