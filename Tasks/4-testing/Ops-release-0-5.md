# Ops-release-0-5

- **ID:** T-0045
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release and version files, docs, marketplace listing (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-release-0-5/` · **Branch:** `feat/release-0-5`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** all tasks above merged
- **Touches:** package versions via `pnpm bump`, CHANGELOG.md, Docs/architecture/ui.md, Docs/requirements/views.md, READMEs, packages/web/docs, Marketplace screenshots

## Goal
Ship all five features as one release (0.5.0). Nothing publishes until this task: only a tag does.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review (strict)  - [x] G6 security  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [x] G11 changelog

## Done when
- [ ] Every task above, including Ext-github-sync, is merged
- [ ] `pnpm bump 0.5.0` in the PR; typecheck, test and `pnpm package` green from a clean install
- [ ] Docs: UI architecture, people and sub-task format, report fields, `gitask serve` security notes; website docs and README screenshots updated (`docs-writer`, `launch-checklist`)
- [ ] Release plan G10 written in this file: rollback (unpublish or 0.5.1), what to watch (Marketplace install, `npx gitask serve`)
- [ ] Human reviews the PR, tags and approves; the agent does not tag
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
- G9 human review: PENDING (T3). Task stays in `4-testing/` until the owner has reviewed it.

## G10 release plan (0.5.0)
- **Release:** the owner reviews, merges to `main` (already merged locally), checks `node scripts/check-release.mjs v0.5.0` prints `stable`, tags `v0.5.0`, pushes only the tag and approves the `release` environment.
- **Rollback:** a published npm version cannot be reused, so fix forward with 0.5.1 (`pnpm bump 0.5.1`, PR, tag). Severe problem within 72 h: `npm unpublish gitask-cli@0.5.0`, unpublish or hide the Marketplace and Open VSX version, ship 0.5.1. If the run fails before publishing: `git tag -d v0.5.0 && git push origin :refs/tags/v0.5.0`. Users on 0.4.0 can reinstall it from the GitHub Release `.vsix`.
- **Watch after tagging:** `npm view gitask-cli version`; Marketplace and Open VSX show 0.5.0; install into a clean VS Code profile and check board, tab icon, card move + commit, assign, Export; run `npx gitask-cli serve` in a fresh folder (token required, 401 without it, foreign Host rejected); open the GitHub Release `.vsix` and look for CSP errors in the webview console; the Marketplace must accept the metadata (0.3.0 was rejected over a keyword).
- **GitHub sync** is proven only against a fake server: test `plan` then `sync --yes` on a throwaway repo and confirm the assignee is notified before relying on it.
- **Screenshots:** placeholders in the READMEs and `packages/web/docs/intro.md` still need real images.
