# Ext-new-task-open-detail

- **ID:** T-0075
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new host-to-webview message in the shared protocol
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-new-task-open-detail/` · **Branch:** `feat/new-task-open-detail`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`, `Tasks/5-done/Ext-new-task-stay-on-board.md`
- **Depends on:** none
- **Touches:** `packages/core/src/protocol.ts`, `packages/vscode/src/extension.ts` (`newTask` only), `packages/cli/src/handler.ts`, `packages/ui/src/shell/App.tsx` (message handler only), `packages/ui/src/host/`, tests

## Goal
After a task is created from the board, open its detail panel so the user can fill it in without leaving the board. Left out of Ext-new-task-stay-on-board because it needs a new host-to-webview message.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] A `taskCreated { path }` style message is sent after create, validated like other messages, and the UI opens the detail panel for it
- [ ] Works in VS Code and in `gitask serve`; a failed create sends nothing
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
