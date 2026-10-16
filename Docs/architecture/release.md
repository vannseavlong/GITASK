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

- One version for both packages. Bump `packages/cli/package.json` and `packages/vscode/package.json` together, commit, then tag. `scripts/check-release.mjs` fails the run if they differ from the tag.
- `vX.Y.Z-beta.1` publishes to the npm `next` tag and the Marketplace/Open VSX pre-release channel.
- A marketplace step is skipped (not failed) while its secret is missing.
- Jobs `npm` and `extension` use the GitHub environment `release`; add required reviewers there to get a manual approval before anything goes live.
- `gitask-core` is bundled into both outputs by esbuild and is never published.

## One-time setup (owner)
Tokens, publisher, namespace and the `release` environment: [setupguide.md](setupguide.md).

## Develop
pnpm 11 (pinned by `packageManager`), Node 24. `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm package`.
