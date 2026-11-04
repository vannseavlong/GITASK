# Ext-new-task-open-detail

- **ID:** T-0075
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new host-to-webview message in the shared protocol
- **Claimed by:** Claude (agent)
- **Worktree:** `GITASK/GITASK-new-task-open-detail/` · **Branch:** `feat/new-task-open-detail`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`, `Tasks/5-done/Ext-new-task-stay-on-board.md`
- **Depends on:** none
- **Touches:** `packages/core/src/protocol.ts`, `packages/vscode/src/extension.ts` (`newTask` only), `packages/cli/src/handler.ts`, `packages/ui/src/shell/App.tsx` (message handler only), `packages/ui/src/host/`, tests

## Goal
After a task is created from the board, open its detail panel so the user can fill it in without leaving the board. Left out of Ext-new-task-stay-on-board because it needs a new host-to-webview message.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [ ] G4 run it (Skipped G4: no VS Code host or browser in this environment)
- [x] G5 code review (cold self-review of the diff, no separate agent)  - [x] G6 security (taskCreated path built only by the host, pinned inside Tasks/ by taskPathInside; UI opens it only if the board holds it)  - [x] G7 docs sync
- [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] A `taskCreated { path }` style message is sent after create, validated like other messages, and the UI opens the detail panel for it
- [x] Works in VS Code and in `gitask serve`; a failed create sends nothing
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Not run in a real VS Code host or browser (G4). Manual check: New task from the board in VS Code and in `gitask serve`; the detail panel should open on the new card.
- Added `taskCreatedMessage` in core protocol, `detail/pending-open.ts` (waits for the board to hold the task), tests in `packages/vscode/test` and `packages/cli/test/task-created.test.ts`.
