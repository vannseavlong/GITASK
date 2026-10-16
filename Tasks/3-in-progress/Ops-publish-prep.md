# Ops-publish-prep

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release/deploy files (.github/workflows), publish tokens, package manager switch
- **Claimed by:** claude session, 2026-10-17
- **Worktree:** `GITASK/GITASK-release-cicd/` · **Branch:** `feat/release-cicd`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/architecture/release.md`
- **Depends on:** Ops-github-remote (repo pushed by owner)
- **Touches:** `.github/workflows/*`, root + `packages/*/package.json`, `pnpm-*`, `README.md`, `Docs/architecture/release.md`

## Goal
CI/CD release on a `v*` tag (same pattern as longcelot-sheet-staging): test, then publish `gitask-cli` to npm, and the extension to VS Code Marketplace + Open VSX, attach the .vsix to a GitHub Release. Switch dev to pnpm. Real publisher id, repo URL, icon, screenshot/GIF in README, then publish to VS Code Marketplace and Open VSX (needs the owner's accounts and tokens; do not publish without owner approval).

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Owner confirms publisher name
- [ ] package.json publisher and repository fixed
- [ ] Release plan (G10) written
- [ ] Owner approves publish
