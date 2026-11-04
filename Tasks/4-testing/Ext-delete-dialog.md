# Ext-delete-dialog

- **ID:** T-0068
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · changes a shared message flow; weakens no guard (security gate on the confirm check) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-delete-dialog/` · **Branch:** `fix/delete-dialog`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/vscode/src/delete-guard.ts` (new, pure guard so it is testable), `Docs/architecture/serve.md`, `packages/ui/src/host/vscode-host.ts`, `packages/ui/src/lib/delete-flow.ts`, `packages/ui/src/components/delete-confirm.tsx`, `packages/vscode/src/extension.ts` (`deleteTask`/`deleteColumn`/`deleteSubtask` cases), `packages/vscode/src/protocol.ts`, tests

## Goal
Replace the plain VS Code warning popup for deleting a task, a status or a sub-task with the in-app confirm dialog that the browser already has (`DeleteConfirm`). One look in both hosts, themed, with the impact text ("recoverable from git" or not) and a red Delete button. The extension still refuses a delete that is not marked `confirmed`, so the safeguard moves, it does not disappear.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [ ] G4 run it
- [x] G5 code review (self fresh-eyes pass of the diff, not a separate agent)  - [x] G6 security (self review: guard runs before the message switch, `confirmed` must be exactly `true`)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

Not run: G4 (no VS Code available to open the webview and see the dialog); a separate review agent for G5/G6.

## Done when
- [x] `VsCodeHost.confirmsDelete` is true (dialog mounted app-wide; not seen in a real webview)
- [x] `extension.ts` deletes only when `confirmed: true` (same rule as `gitask serve`); a bare message is refused with an error
- [ ] (unverified in VS Code) Dialog shows the `describeDeleteImpact` text, is keyboard operable (Esc cancels, focus returns), and follows light/dark/high-contrast
- [x] tests added (`packages/vscode/test/delete-guard.test.ts`); no `showWarningMessage` left for deletes
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
