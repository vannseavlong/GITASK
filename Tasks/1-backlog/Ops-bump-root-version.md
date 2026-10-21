# Ops-bump-root-version

- **ID:** T-0002
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · edits release scripts (`scripts/bump.mjs`, `scripts/check-release.mjs`); pick again before starting
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-bump-root/` · **Branch:** `chore/bump-root-version`
- **Started / updated:** 2026-10-18 / 2026-10-18
- **Due:** none
- **Docs:** `Docs/architecture/release.md`
- **Depends on:** none
- **Touches:** `scripts/bump.mjs`, `scripts/check-release.mjs`, `package.json`, `Docs/architecture/release.md`

## Goal
The root `package.json` (`gitask-monorepo`, private) still says `0.1.1` because `pnpm bump` only sets `packages/cli` and `packages/vscode`, and `check-release.mjs` only checks those two. Decide whether the root should follow the release version; if yes, make `bump` set it too and have the release check include it, so no package.json shows a stale number.

## Gates
Chosen when the task starts (the tier picker puts release files at T3).

## Done when
- [ ] Decision recorded: root follows the release version, or is left alone and documented as unversioned
- [ ] If it follows: `pnpm bump X.Y.Z` updates all three files and `check-release.mjs vX.Y.Z` fails when they differ
- [ ] `Docs/architecture/release.md` states which files carry the version
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
