import { test } from "node:test";
import assert from "node:assert/strict";
import { logoFileProblem, toBase64 } from "../../ui/src/lib/logo-file.ts";

test("logoFileProblem accepts image types within the cap and explains the rest", () => {
  assert.equal(logoFileProblem("a.PNG", 10), undefined);
  assert.equal(logoFileProblem("a.svg", 1024 * 1024), undefined);
  for (const [n, s] of [["a.exe", 5], ["png", 5], [".png", 5], ["a.png", 0], ["a.png", 1024 * 1024 + 1], ["a.png.html", 5]] as const) assert.ok(logoFileProblem(n, s), `${n} ${s}`);
});

test("toBase64 handles a file larger than one chunk", () => {
  const b = new Uint8Array(100_000).map((_, i) => i % 251);
  assert.deepEqual(new Uint8Array(Buffer.from(toBase64(b), "base64")), b);
});
