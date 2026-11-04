import { test } from "node:test";
import assert from "node:assert/strict";
import { hasChanges, projectChanges, projectSavedReply, type ProjectDraft } from "../../ui/src/lib/project-diff.ts";

const L = { align: "left", size: "md", logoPosition: "left", showTitle: true } as const;
const cur = { title: "Acme", subtitle: "Roadmap", layout: { ...L }, hasLogo: true };
const same: ProjectDraft = { title: "Acme", subtitle: "Roadmap", layout: { ...L }, logo: { kind: "keep" } };

test("no change sends nothing", () => {
  assert.deepEqual(projectChanges(cur, same), {});
  assert.equal(hasChanges(projectChanges(cur, { ...same, title: "  Acme  " })), false);
});

test("only the differing fields are sent", () => {
  assert.deepEqual(projectChanges(cur, { ...same, title: "New" }), { title: "New" });
  assert.deepEqual(projectChanges(cur, { ...same, layout: { ...L, size: "lg" } }), { layout: { size: "lg" } });
  assert.deepEqual(projectChanges(cur, { ...same, subtitle: "  " }), { subtitle: null });
});

test("empty text clears a set field and is no change on an unset one", () => {
  assert.deepEqual(projectChanges(cur, { ...same, title: "" }), { title: null });
  assert.deepEqual(projectChanges({ ...cur, title: undefined }, { ...same, title: " " }), {});
});

test("Reset layout sends only what moved away from the defaults", () => {
  const c = { ...cur, layout: { ...L, align: "right" as const, showTitle: false } };
  assert.deepEqual(projectChanges(c, { ...same, layout: { ...L } }), { layout: { align: "left", showTitle: true } });
});

test("logo: new uploads, remove clears only an existing logo", () => {
  assert.deepEqual(projectChanges(cur, { ...same, logo: { kind: "new", name: "a.png", data: "AAAA" } }), { logo: { name: "a.png", data: "AAAA" } });
  assert.deepEqual(projectChanges(cur, { ...same, logo: { kind: "remove" } }), { logo: null });
  assert.deepEqual(projectChanges({ ...cur, hasLogo: false }, { ...same, logo: { kind: "remove" } }), {});
});

test("projectSavedReply accepts only a well-formed reply", () => {
  assert.deepEqual(projectSavedReply({ type: "projectSaved", ok: true }), { ok: true });
  assert.deepEqual(projectSavedReply({ type: "projectSaved", ok: false, error: "boom" }), { ok: false, error: "boom" });
  assert.ok((projectSavedReply({ type: "projectSaved", ok: false }) as { error: string }).error.length > 0);
  assert.equal((projectSavedReply({ type: "projectSaved", ok: false, error: "x".repeat(900) }) as { error: string }).error.length, 300);
  for (const bad of [null, "x", 5, {}, { type: "error", message: "x" }, { type: "projectSaved" }, { type: "projectSaved", ok: "yes" }]) assert.equal(projectSavedReply(bad), undefined);
});
