# Ext-header-dialog-feedback

- **ID:** T-0078
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new host reply in the shared protocol (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-header-dialog-feedback/` · **Branch:** `fix/header-dialog-feedback`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-project-layout-settings.md`, `Tasks/5-done/Ext-delete-dialog.md` (review findings)
- **Depends on:** none
- **Touches:** `packages/ui/src/components/project-dialog.tsx`, `packages/ui/src/shell/project-header.tsx`, `packages/ui/src/lib/`, `packages/core/src/protocol.ts` (reply message only), `packages/vscode/src/extension.ts` and `packages/cli/src/handler.ts` (`setProject` case only), tests, `Docs/architecture/ui.md`

## Goal
Fix the Customize header dialog gaps: it closes before the host answers, so a failed save loses the input; it always sends the full layout plus null title/subtitle, so a no-change save still commits; a logo replaced by hand under the same name is never refetched.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] The host answers `setProject` with a success or error reply; the dialog stays open with the draft and shows the error on failure, and closes only on success
- [ ] Only fields that differ from the current project are sent; saving with no change sends nothing and makes no commit; Reset layout and Remove logo behave as before
- [ ] The logo URL carries a version (file mtime or size from core) so a hand-replaced file refetches
- [ ] Tests for the diff logic and the reply; looked at in the mock build
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
