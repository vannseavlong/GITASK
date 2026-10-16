# Release

Updated: 2026-10-17

Tag-driven. `release.yml` runs on `git push origin vX.Y.Z`.

```
tag vX.Y.Z → verify (tag == package versions, typecheck, test)
           ├─ npm        → gitask-cli          (trusted publishing, no token)
           └─ extension  → VS Code Marketplace (VSCE_PAT)
                         → Open VSX            (OVSX_PAT)
                         → GitHub Release with the .vsix
```

- One version for both packages. `pnpm bump X.Y.Z` sets both (`scripts/bump.mjs`); commit it in the PR, merge, pull `main`, then tag the merged commit. Never use `npm version`: it tags immediately and reformats `package.json`. `scripts/check-release.mjs` fails the run if they differ from the tag.
- `vX.Y.Z-beta.1` publishes to the npm `next` tag and the Marketplace/Open VSX pre-release channel.
- A marketplace step is skipped (not failed) while its secret is missing.
- Jobs `npm` and `extension` use the GitHub environment `release`; add required reviewers there to get a manual approval before anything goes live.
- `gitask-core` is bundled into both outputs by esbuild and is never published.

## Release workflow (every change, every release)

Day to day, nothing publishes: only a pushed tag does.

1. **Work in the task's worktree** on its own branch (`feat/<name>`), per `Tasks/README.md`.
2. **Commit and open a PR to `main`.** `ci.yml` runs typecheck, tests and `pnpm package`. Merge only when it is green.
3. **If the PR is a release,** run `pnpm bump X.Y.Z` in the PR. It sets `packages/cli` and `packages/vscode` to the same version (one line each). Do not use `npm version`.
4. **After the merge,** update local `main`: `git checkout main && git pull origin main`.
5. **Check before tagging:** `git log -1 --oneline` is the merge you expect, and `node scripts/check-release.mjs vX.Y.Z` prints `stable` (or `prerelease`).
6. **Tag the merged commit and push only the tag:**
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
7. **Approve** the `release` environment in Actions, then **check**: `npm view gitask-cli version`, the GitHub Release has `gitask-vscode-X.Y.Z.vsix`, and the Marketplace / Open VSX pages show the version (a new version can take a few minutes to verify).
8. **Close out the task:** `CHANGELOG.md` entry, task file to `5-done/`, remove the worktree and branch.

Rules:
- Not every merge is a release. No tag, no publish.
- Never tag before the version bump is on `main`; the tag must point at a commit where every package has that version.
- A published version is final (npm never reuses one). Fix forward with the next number. A tag whose run failed before publishing can be deleted and re-pushed: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`.
- Agents prepare the PR and the bump; the human commits, merges, tags and approves.

## One-time setup (owner)
Tokens, publisher, namespace and the `release` environment: [setupguide.md](setupguide.md).

## Develop
pnpm 11 (pinned by `packageManager`), Node 24. `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm package`.

## Dependency audit
Check with `pnpm audit` (also `--prod`; in this monorepo it still reports `packages/web`, which is built, not published). Fixes for transitive packages live as `overrides` in `pnpm-workspace.yaml`; drop an override once the parent package requires a patched version itself.

Open advisory (reviewed 2026-10-17):
- `braces` 3.0.3, high, GHSA-vfj7-8cjw-p6xm (ReDoS on huge brace patterns). The advisory lists `>=3.0.4` as patched but no such version is on npm (latest is 3.0.3), so it cannot be overridden. It comes only from build-time tools (`@vscode/vsce` via secretlint, and Docusaurus in `packages/web`) that run on our own files; nothing ships in the `.vsix` or the `gitask-cli` bundle. Accepted; re-check when `pnpm audit` shows a patched release.
