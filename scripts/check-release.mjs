// Release guard: the git tag vX.Y.Z must equal the version of every published package.
import { readFileSync } from "node:fs";

const tag = (process.argv[2] ?? "").replace(/^refs\/tags\//, "");
const want = tag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(want)) {
  console.error(`Tag "${tag}" is not vX.Y.Z`);
  process.exit(1);
}
let bad = false;
for (const p of ["packages/cli/package.json", "packages/vscode/package.json"]) {
  const v = JSON.parse(readFileSync(p, "utf8")).version;
  if (v !== want) {
    console.error(`${p} is ${v}, tag is ${want}`);
    bad = true;
  }
}
if (bad) process.exit(1);
// pre-release (1.0.0-beta.1) goes to the npm "next" tag and VS Code pre-release channel
console.log(want.includes("-") ? "prerelease" : "stable");
