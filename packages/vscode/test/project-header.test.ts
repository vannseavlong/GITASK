import { test } from "node:test";
import assert from "node:assert/strict";
import { headerClasses, headerParts } from "../../ui/src/lib/project-header.ts";

const L = { align: "left", size: "md", logoPosition: "left" } as const;

test("no project, or nothing left to show, renders nothing", () => {
  assert.equal(headerParts(undefined, false), null);
  assert.equal(headerParts({ layout: L }, false), null);
  assert.equal(headerParts({ logo: { path: "a.png" }, layout: { ...L, logoPosition: "hidden" } }, false), null);
});

test("a broken logo falls back to the text; a subtitle shows without a title", () => {
  assert.deepEqual(headerParts({ title: "A", logo: { path: "a.png" }, layout: L }, true), { title: "A", subtitle: undefined, logo: false });
  assert.deepEqual(headerParts({ subtitle: "S", layout: L }, false), { title: undefined, subtitle: "S", logo: false });
  assert.equal(headerParts({ logo: { path: "a.png" }, layout: L }, true), null);
});

test("every layout combination yields classes; position and alignment map as documented", () => {
  for (const align of ["left", "center", "right"] as const)
    for (const size of ["sm", "md", "lg"] as const)
      for (const logoPosition of ["left", "top", "right", "hidden"] as const) {
        const c = headerClasses({ align, size, logoPosition });
        for (const v of Object.values(c)) assert.ok(v.length > 0);
        assert.ok(c.root.includes("min-w-0") && c.title.includes("break-words"), "long text wraps at narrow width");
      }
  assert.match(headerClasses({ ...L, logoPosition: "top", align: "center" }).root, /flex-col items-center/);
  const right = headerClasses({ ...L, logoPosition: "right", align: "right" });
  assert.match(right.root, /flex-row .*justify-end/, "content sits on the right edge");
  assert.doesNotMatch(right.root, /reverse/, "a reversed row would swap the justify edges");
  assert.match(right.logo, /order-last/, "the logo goes after the text without reversing the row");
  assert.match(headerClasses({ ...L, logoPosition: "right", align: "left" }).root, /justify-start/);
  assert.match(headerClasses({ ...L, logoPosition: "left" }).root, /flex-row .*justify-start/);
  assert.match(headerClasses({ ...L, size: "lg" }).logo, /h-16/);
});
