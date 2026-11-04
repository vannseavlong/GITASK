import { test } from "node:test";
import assert from "node:assert/strict";
import { headerClasses, headerParts } from "../../ui/src/lib/project-header.ts";

const L = { align: "left", size: "md", logoPosition: "left", showTitle: true } as const;

test("no project, or nothing left to show, renders nothing", () => {
  assert.equal(headerParts(undefined, false), null);
  assert.equal(headerParts({ layout: L }, false), null);
  assert.equal(headerParts({ logo: { path: "a.png" }, layout: { ...L, logoPosition: "hidden" } }, false), null);
  assert.equal(headerParts({ title: "A", layout: { ...L, showTitle: false } }, false), null);
});

test("a broken logo falls back to the text; showTitle=false keeps the subtitle", () => {
  assert.deepEqual(headerParts({ title: "A", logo: { path: "a.png" }, layout: L }, true), { title: "A", subtitle: undefined, logo: false });
  assert.deepEqual(headerParts({ title: "A", subtitle: "S", layout: { ...L, showTitle: false } }, false), { title: undefined, subtitle: "S", logo: false });
  assert.equal(headerParts({ logo: { path: "a.png" }, layout: L }, true), null);
});

test("every layout combination yields classes; position and alignment map as documented", () => {
  for (const align of ["left", "center", "right"] as const)
    for (const size of ["sm", "md", "lg"] as const)
      for (const logoPosition of ["left", "top", "right", "hidden"] as const) {
        const c = headerClasses({ align, size, logoPosition, showTitle: true });
        for (const v of Object.values(c)) assert.ok(v.length > 0);
        assert.ok(c.root.includes("min-w-0") && c.title.includes("break-words"), "long text wraps at narrow width");
      }
  assert.match(headerClasses({ ...L, logoPosition: "top", align: "center" }).root, /flex-col items-center/);
  assert.match(headerClasses({ ...L, logoPosition: "right", align: "right" }).root, /flex-row-reverse.*justify-end/);
  assert.match(headerClasses({ ...L, logoPosition: "left" }).root, /flex-row .*justify-start/);
  assert.match(headerClasses({ ...L, size: "lg" }).logo, /h-16/);
});
