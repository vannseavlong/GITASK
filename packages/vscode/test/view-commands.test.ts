import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VIEW_COMMANDS } from "../src/view-commands.ts";
import { VIEW_IDS } from "../src/view-ids.ts";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const commands: { command: string; title: string }[] = pkg.contributes.commands;
const keys: { command: string; key: string; mac?: string }[] = pkg.contributes.keybindings;

test("one view command per view id", () => {
  assert.deepEqual(VIEW_COMMANDS.map((c) => c.view), [...VIEW_IDS]);
  assert.equal(new Set(VIEW_COMMANDS.map((c) => c.command)).size, VIEW_IDS.length);
});

test("every view command is in the palette with a unique GITASK title", () => {
  for (const c of VIEW_COMMANDS) {
    const entry = commands.find((x) => x.command === c.command);
    assert.ok(entry, `${c.command} missing from contributes.commands`);
    assert.match(entry.title, /^GITASK: Show /);
  }
  const titles = commands.map((c) => c.title);
  assert.equal(new Set(titles).size, titles.length, "two palette entries share a title");
});

test("every view command has a GITASK chord keybinding, all distinct", () => {
  for (const c of VIEW_COMMANDS) {
    const k = keys.find((x) => x.command === c.command);
    assert.ok(k, `${c.command} has no keybinding`);
    assert.match(k.key, /^ctrl\+alt\+g [a-z]$/);
    assert.match(k.mac ?? "", /^cmd\+alt\+g [a-z]$/);
  }
  const all = keys.map((k) => k.key);
  assert.equal(new Set(all).size, all.length);
  // Keybindings only for commands that exist.
  for (const k of keys) assert.ok(commands.some((c) => c.command === k.command), k.command);
});
