# Ext-ui-export

- **ID:** T-0043
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · export of personal data, new feature, writes files outside the repo (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-export/` · **Branch:** `feat/ui-export`
- **Started / updated:** 2026-10-30 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-done-report, Ext-ui-views
- **Touches:** packages/ui/src/components/export-dialog.tsx, protocol (`exportReport` message), packages/vscode/src/extension.ts (save dialog), packages/cli/src/serve.ts (download route, one case)

## Goal
An Export button that turns the current filter (date range, people, statuses) into a report, with a live preview and a format choice.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review (strict)  - [x] G6 security  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [x] G11 changelog

## Done when
- [ ] Export dialog opens pre-filled from the active filter; user can change period, people, include sub-tasks, format (HTML, Markdown, CSV)
- [ ] Preview renders the real HTML report in a sandboxed iframe (no scripts)
- [ ] VS Code: native save dialog, then offers to open the file; browser: file download from the serve route
- [ ] Report is built in the host from the validated filter, not from HTML sent by the webview
- [ ] Verified on this repo: a month with several people, a month with none, a person with no tasks
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
- G9 human review: PENDING (T3). Task stays in `4-testing/` until the owner has reviewed it.
