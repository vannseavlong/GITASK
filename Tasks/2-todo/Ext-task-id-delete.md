# Ext-task-id-delete

- **Repo:** gitask (`packages/core`, `packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T3 · deletes user files, rewrites existing task files (ID backfill), new core API + protocol messages (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/gitask-task-id-delete/` · **Branch:** `feat/task-id-delete`
- **Started / updated:** 2026-10-20 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** `packages/core/src/{types,parse,create,delete,index}.ts` (+tests), `packages/vscode/src/{protocol,extension,detail}.ts`, `packages/vscode/src/views/{board,list}.ts`, `Tasks/_TEMPLATE.md`. Shares `protocol.ts`, `extension.ts`, `board.ts`, `list.ts`, `types.ts` with Ext-status-color and Ext-date-filter: additive edits only.

## Goal
Give every task a short visible ID (`T-0001`) and let the user delete a task or an empty status from the board.

## Gates (T3: all except a skipped one needs a reason)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] `parse` reads `- **ID:**` into `Task.displayId`; `createTask` assigns max+1 across all columns; `_TEMPLATE.md` has the field
- [ ] `assignIds(tasksDir)` backfills missing IDs once, never changes an existing ID, commits touched paths only (no `git add -A`); runs on first board open and is a no-op afterwards
- [ ] ID shown on board cards, list rows and detail panel, and matched by the text filter
- [ ] `deleteTask`: host confirm modal, `git rm` + pathspec commit when tracked, plain unlink otherwise; respects `gitask.autoCommit`
- [ ] `deleteColumn`: refused with a clear message if the folder has any task; confirm; removes the empty folder
- [ ] `protocol.ts` validates both new messages (path inside Tasks, column exists); tests cover rejects
- [ ] Tests on real temp git repos: delete tracked, untracked, non-git, column with tasks refused, ID backfill idempotent, duplicate IDs handled
- [ ] `Docs/requirements/views.md` updated; root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
