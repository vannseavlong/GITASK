# Ops-release-0-5-1

- **ID:** T-0064
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files; a tag publishes to npm, the Marketplace and Open VSX (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-release-0-5-1/` · **Branch:** `chore/release-0-5-1`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Docs/architecture/release.md` (Release workflow)
- **Depends on:** none required; `Core-test-isolate-git-repo` and `Ops-web-cache-headers` are independent (website and test only)
- **Touches:** `packages/cli/package.json`, `packages/vscode/package.json` (via `pnpm bump 0.5.1`), `CHANGELOG.md`

## Goal
Publish 0.5.1. The only shipped change since v0.5.0 is `packages/vscode/README.md` (Getting started in 5 steps, real screenshots, link to the guide). The Marketplace and Open VSX listing only refresh on a new version, and the same version number goes to npm (`gitask-cli`) because both packages share one.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (352/352)  - [~] G4 run it (`pnpm package` built gitask-vscode-0.5.1.vsix, 270 KB; not installed in VS Code)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] `pnpm bump 0.5.1` in the PR; `node scripts/check-release.mjs v0.5.1` prints `stable`; typecheck, tests and `pnpm package` green
- [ ] Human merges, pulls `main`, tags `v0.5.1`, pushes only the tag, approves the `release` environment (agents never tag)
- [ ] After publish: `npm view gitask-cli version` is 0.5.1; the GitHub Release has exactly one `gitask-vscode-0.5.1.vsix`; Marketplace and Open VSX show 0.5.1 and the README renders (WebP images, dark/light pair): if not, fix forward in 0.5.2
- [ ] G10 release plan (below) written
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## G10 release plan (0.5.1)
- **Why now:** the listing README is stale (placeholders, no screenshots, no guide); nothing else changed in shipped code.
- **Rollback:** a published version is final. Fix forward with 0.5.2. A tag whose run failed before publishing can be deleted and re-pushed (see `release.md`).
- **Watch:** the `release` run in Actions; npm version; Marketplace and Open VSX pages (a new version can take a few minutes to verify).
- **Known unknown:** whether the Marketplace renders WebP from `raw.githubusercontent.com` and handles the `#gh-dark-mode-only` / `#gh-light-mode-only` pair (it may show both images). If bad, switch the extension README to one PNG set in 0.5.2.
- **If hosting is down:** unaffected (releases do not use the website).
