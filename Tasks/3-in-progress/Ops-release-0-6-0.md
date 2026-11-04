# Ops-release-0-6-0

- **ID:** T-0077
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files; a tag publishes to npm, the Marketplace and Open VSX (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-05
- **Worktree:** `GITASK/GITASK-release-0-6-0/` · **Branch:** `chore/release-0-6-0`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Docs/architecture/release.md` (Release workflow), `Tasks/6-deploy/Ops-release-0-5-2.md`, `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Ext-verify-in-vscode (manual check done and bugs fixed)
- **Touches:** `packages/cli/package.json`, `packages/vscode/package.json` (via `pnpm bump 0.6.0`), `packages/vscode/README.md` (listing text for the new features), `CHANGELOG.md`, `packages/web/docs/` (views, task-format, report, new project-header page), `packages/web/sidebars.ts`, `packages/web/src/landing/` ("What's new" for 0.6.0)

## Goal
Publish 0.6.0: stay-on-board create, in-app delete dialog, Overview-first reorderable tabs, project header (title, logo, layout) with a settings dialog and report header, and the simpler install page. New user-visible feature, so a minor version. The human tags, pushes only the tag and approves the `release` environment; the agent never tags.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (453/453)  - [~] G4 run it (`pnpm package` built gitask-vscode-0.6.0.vsix, 286 KB; the same build line was installed and checked by the owner in VS Code before this PR)
- [ ] G5 code review  - [ ] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [x] G10 release plan  - [x] G11 changelog
- Skipped G5/G6 for this PR: it adds a version bump, docs and copy only; the code in the release was reviewed and security-reviewed in each task (see `5-done/`).

## Done when
- [x] `pnpm bump 0.6.0` in the PR; `node scripts/check-release.mjs v0.6.0` prints `stable`; typecheck, tests and `pnpm package` green
- [x] `packages/vscode/README.md` mentions the project header, tab order and Add status; the two screenshots are unchanged (dark, one per view)
- [x] G10 release plan written (rollback: fix forward with 0.6.1; watch the `release` run, npm, Marketplace upload by hand while `VSCE_PAT` is empty, Open VSX)
- [ ] Human merges, pulls `main`, tags `v0.6.0`, pushes only the tag, approves the `release` environment
- [ ] After publish: `npm view gitask-cli version` is 0.6.0; the GitHub Release has exactly one `gitask-vscode-0.6.0.vsix`; Marketplace and Open VSX show 0.6.0
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## G10 release plan (0.6.0)
- **Why now:** the UX and branding wave is built, merged on `main` and was checked by hand in VS Code (project header with logo, tab order, Add status, in-app delete, heatmap).
- **Contents:** stay-on-board create with the detail panel; in-app delete dialog (shared confirm rule); Overview-first reorderable tabs; project header (title, subtitle, logo, layout) with a settings dialog and report header; Add status; responsive Activity heatmap; simpler install page (website, not part of the tag).
- **Risk:** the board and the extension host now write a logo file and `gitask.json` (validated in core: path, symlinks, size, magic bytes, plain-SVG allow-list), and add folders under `Tasks/`. A bug there changes user files, but every write is a pathspec commit that git can undo.
- **Rollback:** a published version is final; fix forward with 0.6.1. A tag whose run failed before publishing can be deleted and re-pushed (see `release.md`). Users can reinstall 0.5.2 from the Marketplace "Previous versions" or the GitHub Release.
- **Watch:** the `release` run in Actions; `npm view gitask-cli version`; the GitHub Release has exactly one `gitask-vscode-0.6.0.vsix`; Marketplace upload by hand while `VSCE_PAT` is empty; Open VSX.
- **Not covered by a human check:** Firefox drag in `gitask serve`, a screen reader, touch input.
- **Website:** deploy separately with `pnpm deploy:web` from `main` after the merge (docs, "What's new" and the project-header page); it does not take part in the tag.
- **Known gap:** the `VSCE_PAT` secret is not set, so the tag does not publish to the Marketplace by itself.
