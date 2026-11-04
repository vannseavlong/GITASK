# Ext-new-task-stay-on-board

- **ID:** T-0067
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · one handler, UI behaviour (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-new-task-stay-on-board/` · **Branch:** `fix/new-task-stay-on-board`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/vscode/src/extension.ts` (`newTask` only), `packages/vscode/test/`

## Goal
Creating a task from the board must not open the raw `.md`. The user stays on the board, the new card appears, and the task detail panel is the way to read or edit it. An "Open file" action stays available for people who want the file.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Board "New task" creates the card, shows it in its column, and does not call `showTextDocument`
- [ ] The palette command `GITASK: New Task` (no board open) creates the task and reveals the board, not the file
- [ ] A short non-modal notice offers "Open file" (and the detail panel opens for the new task, if the owner confirms that choice in the plan)
- [ ] An error (duplicate id, bad folder) still shows an error message and leaves the board as is
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
