// Run the built CLI from this monorepo: `pnpm gitask <args>` / `pnpm serve`. Builds first when dist is missing.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "packages/cli/dist/gitask.js");
if (!existsSync(bin)) {
  console.error("gitask: dist missing, building the CLI first...");
  const b = spawnSync("pnpm", ["--filter", "gitask-cli", "run", "build"], { cwd: root, stdio: "inherit" });
  if (b.status !== 0) process.exit(b.status ?? 1);
}
const r = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status ?? 1);
