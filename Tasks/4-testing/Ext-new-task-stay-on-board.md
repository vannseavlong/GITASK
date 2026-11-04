# Ext-new-task-stay-on-board

- **ID:** T-0067
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · one handler, UI behaviour (auto picker, see `PIPELINE.md`)
- **Claimed by:** Claude (agent)
- **Worktree:** `GITASK/GITASK-new-task-stay-on-board/` · **Branch:** `fix/new-task-stay-on-board`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/vscode/src/extension.ts` (`newTask` only), `packages/vscode/test/`

## Goal
Creating a task from the board must not open the raw `.md`. The user stays on the board, the new card appears, and the task detail panel is the way to read or edit it. An "Open file" action stays available for people who want the file.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it (Skipped G4: no VS Code host in this environment; see Notes)
- [x] G8 PR message  - [x] G11 changelog

## Done when
- [x] Board "New task" creates the card, shows it in its column, and does not call `showTextDocument`
- [x] The palette command `GITASK: New Task` (no board open) creates the task and reveals the board, not the file
- [x] A short non-modal notice offers "Open file". Detail panel auto-open is deferred (needs a new host message in core protocol + UI, outside Touches)
- [x] An error (duplicate id, bad folder) still shows an error message and leaves the board as is
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Added `packages/vscode/test/new-task-flow.test.ts`: a source-shape guard, because `extension.ts` imports `vscode` and cannot run under node:test.
- Not run in a real VS Code host (G4). Manual check needed: New task from the board, and `GITASK: New Task` with the board closed.
- Open question 1 (open detail panel after create) is not done here. It needs a new `HostMessage` in core `protocol.ts` and a UI handler; follow-up task.
