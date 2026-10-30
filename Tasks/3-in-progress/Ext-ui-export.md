# Ext-ui-export

- **ID:** T-0043
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · export of personal data, new feature, writes files outside the repo (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-export/` · **Branch:** `feat/ui-export`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-done-report, Ext-ui-views
- **Touches:** packages/ui/src/components/export-dialog.tsx, protocol (`exportReport` message), packages/vscode/src/extension.ts (save dialog), packages/cli/src/serve.ts (download route, one case)

## Goal
An Export button that turns the current filter (date range, people, statuses) into a report, with a live preview and a format choice.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Export dialog opens pre-filled from the active filter; user can change period, people, include sub-tasks, format (HTML, Markdown, CSV)
- [ ] Preview renders the real HTML report in a sandboxed iframe (no scripts)
- [ ] VS Code: native save dialog, then offers to open the file; browser: file download from the serve route
- [ ] Report is built in the host from the validated filter, not from HTML sent by the webview
- [ ] Verified on this repo: a month with several people, a month with none, a person with no tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
