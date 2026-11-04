# Ext-delete-dialog

- **ID:** T-0068
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · changes a shared message flow; weakens no guard (security gate on the confirm check) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-delete-dialog/` · **Branch:** `fix/delete-dialog`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/ui/src/host/vscode-host.ts`, `packages/ui/src/lib/delete-flow.ts`, `packages/ui/src/components/delete-confirm.tsx`, `packages/vscode/src/extension.ts` (`deleteTask`/`deleteColumn`/`deleteSubtask` cases), `packages/vscode/src/protocol.ts`, tests

## Goal
Replace the plain VS Code warning popup for deleting a task, a status or a sub-task with the in-app confirm dialog that the browser already has (`DeleteConfirm`). One look in both hosts, themed, with the impact text ("recoverable from git" or not) and a red Delete button. The extension still refuses a delete that is not marked `confirmed`, so the safeguard moves, it does not disappear.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `VsCodeHost.confirmsDelete` is true; the delete dialog shows in the board, list and task detail, for tasks, empty statuses and sub-tasks
- [ ] `extension.ts` deletes only when `confirmed: true` (same rule as `gitask serve`); a bare message is refused with an error
- [ ] Dialog shows the `describeDeleteImpact` text, is keyboard operable (Esc cancels, focus returns), and follows light/dark/high-contrast
- [ ] `delete-flow` tests updated; no `showWarningMessage` left for deletes
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
