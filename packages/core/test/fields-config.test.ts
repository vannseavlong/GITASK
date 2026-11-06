import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBoard, parseFields, readFields, MAX_FIELDS, MAX_FIELD_VALUES } from "../src/index.ts";

const platform = {
  key: "platform", label: "Platform", multi: true,
  values: [{ id: "admin-portal", label: "Admin Portal", color: "#3794FF" }, { id: "app", label: "App" }, { id: "landing-page", label: "Landing Page" }],
};

test("parseFields: the Platform example", () => {
  const f = parseFields(JSON.stringify({ fields: [platform] }));
  assert.equal(f.length, 1);
  assert.equal(f[0].key, "platform");
  assert.equal(f[0].multi, true);
  assert.deepEqual(f[0].values.map((v) => v.label), ["Admin Portal", "App", "Landing Page"]);
  assert.equal(f[0].values[0].color, "#3794ff");
  assert.equal(f[0].values[1].color, undefined);
});

test("parseFields: missing, malformed or wrong-typed input yields none", () => {
  for (const t of ["", "{", "[]", "null", "{}", '{"fields":{}}', '{"fields":"x"}', '{"fields":[null,1,"a",[]]}']) assert.deepEqual(parseFields(t), []);
});

test("parseFields: a bad entry is dropped alone", () => {
  const bad = [
    { key: "Platform", values: [{ id: "a" }] }, // upper case
    { key: "owner", values: [{ id: "a" }] }, // reserved
    { key: "1x", values: [{ id: "a" }] },
    { key: "no-values", values: [] },
    { key: "all-bad", values: [{ id: "A B" }, { id: "" }, 5] },
    { key: "__proto__", values: [{ id: "a" }] },
  ];
  const f = parseFields(JSON.stringify({ fields: [...bad, platform] }));
  assert.deepEqual(f.map((x) => x.key), ["platform"]);
});

test("parseFields: a duplicate key keeps the first", () => {
  const f = parseFields(JSON.stringify({ fields: [platform, { key: "platform", values: [{ id: "x" }] }] }));
  assert.equal(f.length, 1);
  assert.equal(f[0].values.length, 3);
});

test("parseFields: bad values dropped, label and colour defaults", () => {
  const f = parseFields(JSON.stringify({ fields: [{ key: "env", values: [
    { id: "dev", label: "  Dev\u0007 " }, { id: "dev" }, { id: "Prod" }, { id: "qa", color: "red" }, { id: "x", label: 5 }, null,
  ] }] }));
  assert.deepEqual(f[0].values.map((v) => v.id), ["dev", "qa", "x"]);
  assert.equal(f[0].values[0].label, "Dev");
  assert.equal(f[0].values[1].label, "qa");
  assert.equal(f[0].values[1].color, undefined);
  assert.equal(f[0].label, "env");
  assert.equal(f[0].multi, false);
});

test("parseFields: limits", () => {
  const many = Array.from({ length: MAX_FIELDS + 3 }, (_, i) => ({ key: `f${i}`, values: [{ id: "a" }] }));
  assert.equal(parseFields(JSON.stringify({ fields: many })).length, MAX_FIELDS);
  const vals = Array.from({ length: MAX_FIELD_VALUES + 5 }, (_, i) => ({ id: `v${i}` }));
  assert.equal(parseFields(JSON.stringify({ fields: [{ key: "k", values: vals }] }))[0].values.length, MAX_FIELD_VALUES);
  const long = "x".repeat(200);
  assert.equal([...parseFields(JSON.stringify({ fields: [{ key: "k", label: long, values: [{ id: "a", label: long }] }] }))[0].label].length, 40);
});

test("parseFields: __proto__ as data never pollutes", () => {
  parseFields('{"fields":[{"key":"k","values":[{"id":"a","__proto__":{"x":1}}],"__proto__":{"y":2}}]}');
  assert.equal(({} as Record<string, unknown>).x, undefined);
  assert.equal(({} as Record<string, unknown>).y, undefined);
});

function ws(config?: string) {
  const dir = mkdtempSync(join(tmpdir(), "gitask-fields-"));
  mkdirSync(join(dir, "2-todo"));
  writeFileSync(join(dir, "2-todo", "Core-a.md"), "# A\n");
  if (config !== undefined) writeFileSync(join(dir, "gitask.json"), config);
  return dir;
}

test("loadBoard: config.fields only when configured", async () => {
  const none = await loadBoard(ws());
  assert.equal("config" in none, false);
  assert.equal("config" in (await loadBoard(ws('{"columns":{}}'))), false);
  const withF = await loadBoard(ws(JSON.stringify({ fields: [platform] })));
  assert.equal(withF.config?.fields[0].key, "platform");
});

test("readFields: a symlinked gitask.json is not read", async () => {
  const dir = ws();
  const other = mkdtempSync(join(tmpdir(), "gitask-fields-out-"));
  writeFileSync(join(other, "c.json"), JSON.stringify({ fields: [platform] }));
  symlinkSync(join(other, "c.json"), join(dir, "gitask.json"));
  assert.deepEqual(await readFields(dir), []);
});

test("parseFields: control and bidi characters in labels become spaces; long labels are cut", () => {
  const f = parseFields(JSON.stringify({ fields: [{ key: "k", label: "Plat\u0007form‮", values: [{ id: "a", label: "A\nB" }] }] }));
  assert.equal(f[0].label, "Plat form");
  assert.equal(f[0].values[0].label, "A B");
});

test("parseFields: __proto__ / constructor as value ids and keys are plain data or dropped", () => {
  const f = parseFields('{"fields":[{"key":"constructor","values":[{"id":"__proto__"},{"id":"constructor"},{"id":"ok"}]}]}');
  assert.deepEqual(f[0].values.map((v) => v.id), ["constructor", "ok"]);
});
