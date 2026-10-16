// Usage: pnpm bump <X.Y.Z[-pre]>   Sets the version in both published packages.
// Edits only the "version" line, so formatting stays untouched. Does not commit or tag.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const next = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(next ?? "")) {
  console.error("Usage: pnpm bump <X.Y.Z or X.Y.Z-beta.1>");
  process.exit(1);
}
const root = join(fileURLToPath(import.meta.url), "..", "..");
for (const p of ["packages/cli/package.json", "packages/vscode/package.json"]) {
  const file = join(root, p);
  const text = readFileSync(file, "utf8");
  const out = text.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${next}"`);
  JSON.parse(out);
  writeFileSync(file, out);
  console.log(`${p} -> ${next}`);
}
console.log(`\nNext: commit, open PR, merge, pull main, then:\n  git tag v${next} && git push origin v${next}`);
