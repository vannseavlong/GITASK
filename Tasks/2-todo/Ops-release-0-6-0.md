# Ops-release-0-6-0

- **ID:** T-0077
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files; a tag publishes to npm, the Marketplace and Open VSX (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-release-0-6-0/` · **Branch:** `chore/release-0-6-0`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Docs/architecture/release.md` (Release workflow), `Tasks/6-deploy/Ops-release-0-5-2.md`, `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Ext-verify-in-vscode (manual check done and bugs fixed)
- **Touches:** `packages/cli/package.json`, `packages/vscode/package.json` (via `pnpm bump 0.6.0`), `packages/vscode/README.md` (listing text for the new features), `CHANGELOG.md`

## Goal
Publish 0.6.0: stay-on-board create, in-app delete dialog, Overview-first reorderable tabs, project header (title, logo, layout) with a settings dialog and report header, and the simpler install page. New user-visible feature, so a minor version. The human tags, pushes only the tag and approves the `release` environment; the agent never tags.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] `pnpm bump 0.6.0` in the PR; `node scripts/check-release.mjs v0.6.0` prints `stable`; typecheck, tests and `pnpm package` green
- [ ] `packages/vscode/README.md` mentions the project header and tab order, with one dark image per view
- [ ] G10 release plan written (rollback: fix forward with 0.6.1; watch the `release` run, npm, Marketplace upload by hand while `VSCE_PAT` is empty, Open VSX)
- [ ] Human merges, pulls `main`, tags `v0.6.0`, pushes only the tag, approves the `release` environment
- [ ] After publish: `npm view gitask-cli version` is 0.6.0; the GitHub Release has exactly one `gitask-vscode-0.6.0.vsix`; Marketplace and Open VSX show 0.6.0
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
