# Ops-bump-root-version

- **ID:** T-0002
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · edits release scripts (`scripts/bump.mjs`, `scripts/check-release.mjs`); re-picked from the real diff 2026-11-12, still T3
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-bump-root/` · **Branch:** `chore/bump-root-version`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Due:** none
- **Docs:** `Docs/architecture/release.md`
- **Depends on:** none
- **Touches:** `scripts/bump.mjs`, `scripts/check-release.mjs`, `package.json`, `Docs/architecture/release.md`

## Goal
The root `package.json` (`gitask-monorepo`, private) still says `0.1.1` because `pnpm bump` only sets `packages/cli` and `packages/vscode`, and `check-release.mjs` only checks those two. Decide whether the root should follow the release version; if yes, make `bump` set it too and have the release check include it, so no package.json shows a stale number.

## Decision
The root `package.json` follows the release version (decided by the lead, 2026-11-12). `pnpm bump X.Y.Z` sets root, `packages/cli` and `packages/vscode`; `check-release.mjs vX.Y.Z` fails if any of the three differ. Root set to `0.6.1` to match the current release (not a new release; cli/vscode stay `0.6.1`). `packages/core`, `ui`, `web` keep their versions and are documented as internal and unversioned.

## Gates (T3)
Commit `c9d6007` on `chore/bump-root-version`; diff: `package.json`, `scripts/bump.mjs`, `scripts/check-release.mjs`, `Docs/architecture/release.md`.

- [x] G1 scope: diff touches only the four `Touches` paths
- [x] G2 `pnpm typecheck`: exit 0
- [x] G3 tests: `pnpm test` 491/491 pass. No pattern for script tests in the repo (the `test` glob covers `packages/*/test` only), so the scripts were verified by hand in a scratch copy (root + cli + vscode `package.json` and both scripts): `check-release v0.6.1` and `refs/tags/v0.6.1` print `stable` (exit 0); `v0.6.2` fails listing all three (exit 1); `bump 9.9.9` sets all three, root formatting unchanged, then `check v9.9.9` passes; `bump 9.9.10-beta.1` then check prints `prerelease`; root alone set to a different version → fails naming `package.json`; vscode alone different → fails naming it
- [x] G4 run it: in the worktree `node scripts/check-release.mjs v0.6.1` → `stable`, `v0.6.2` → exit 1 with all three files listed
- [x] G5 code review: lead session read the diff cold (4 files, +9/-8). Same file list in bump and check, version regex validated before writes, release.yml call unchanged. No findings.
- [x] G6 security: input is validated by the existing anchored regex `^\d+\.\d+\.\d+(-[\w.]+)?$` before any file is touched; checked that empty, `1.2`, `9.9.9"x` (bump) and `v0.6.1; rm -rf /` (check) are rejected with exit 1. `release.yml` passes `"$GITHUB_REF"` quoted. No new input paths; the file list is hard-coded
- [x] G7 docs: `Docs/architecture/release.md` states the three versioned files, that `bump`/`check-release` cover all three, and that core/ui/web are internal and unversioned
- [ ] G9 human review: for the user, not run
- [x] G10 release plan: no release and no publish in this change; `release.yml` already calls `check-release.mjs`, which now also checks the root, so the next tag needs `pnpm bump` (which sets the root too). Rollback: revert `c9d6007`. Dependencies: none. Monitor: the owner watches the `verify` job on the next tag
- G8 and G11 happen at PR/merge (CHANGELOG entry on merge)

## Done when
- [x] Decision recorded: root follows the release version, or is left alone and documented as unversioned
- [x] If it follows: `pnpm bump X.Y.Z` updates all three files and `check-release.mjs vX.Y.Z` fails when they differ
- [x] `Docs/architecture/release.md` states which files carry the version
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
