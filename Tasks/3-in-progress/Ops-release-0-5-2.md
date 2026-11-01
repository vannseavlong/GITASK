# Ops-release-0-5-2

- **ID:** T-0066
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files; a tag publishes to npm, the Marketplace and Open VSX (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-release-0-5-2/` · **Branch:** `chore/release-0-5-2`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Docs/architecture/release.md` (Release workflow), `Tasks/6-deploy/Ops-release-0-5-1.md`
- **Depends on:** none (0.5.1 is published)
- **Touches:** `packages/vscode/README.md`, `packages/cli/package.json`, `packages/vscode/package.json` (via `pnpm bump 0.5.2`), `CHANGELOG.md`

## Goal
Fix the Marketplace listing: 0.5.1 showed the dark and the light screenshot one after the other, because the Marketplace ignores the `#gh-dark-mode-only` / `#gh-light-mode-only` fragments. Keep one dark image per view in `packages/vscode/README.md` and publish 0.5.2 (the listing only updates on a new version). The root `README.md` keeps both versions, GitHub honors the fragments.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (352/352)  - [~] G4 run it (`pnpm package` built gitask-vscode-0.5.2.vsix, 270 KB; not installed in VS Code)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] `packages/vscode/README.md` has one dark image for the board and one for the task detail, no `#gh-*-mode-only` fragments, no light images
- [x] `pnpm bump 0.5.2`; `node scripts/check-release.mjs v0.5.2` prints `stable`; typecheck, tests and `pnpm package` green
- [ ] Human merges, pulls `main`, tags `v0.5.2`, pushes only the tag; approves the `release` environment; uploads the .vsix to the Marketplace by hand while `VSCE_PAT` is not set
- [ ] After publish: `npm view gitask-cli version` is 0.5.2; the GitHub Release has exactly one `gitask-vscode-0.5.2.vsix`; Marketplace and Open VSX show 0.5.2 with one image per view
- [ ] G10 release plan (below) written
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## G10 release plan (0.5.2)
- **Why now:** the 0.5.1 listing README shows every screenshot twice (seen on the Marketplace). Nothing else in shipped code changed.
- **Rollback:** a published version is final; fix forward with 0.5.3. A tag whose run failed before publishing can be deleted and re-pushed (see `release.md`).
- **Watch:** the `release` run in Actions; npm version; the Marketplace page (manual upload, since `VSCE_PAT` is empty); Open VSX.
- **Known gap:** the `VSCE_PAT` secret is not set, so the tag does not publish to the Marketplace by itself.
