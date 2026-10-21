# Ext-task-id-delete

- **ID:** T-0013
- **Repo:** gitask (`packages/core`, `packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T3 · deletes user files, rewrites existing task files (ID backfill), new core API + protocol messages (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-task-id-delete/` · **Branch:** `feat/task-id-delete`
- **Started / updated:** 2026-10-20 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** `packages/core/src/{types,parse,create,delete,index}.ts` (+tests), `packages/vscode/src/{protocol,extension,detail}.ts`, `packages/vscode/src/views/{board,list}.ts`, `Tasks/_TEMPLATE.md`. Shares `protocol.ts`, `extension.ts`, `board.ts`, `list.ts`, `types.ts` with Ext-status-color and Ext-date-filter: additive edits only.

## Goal
Give every task a short visible ID (`T-0001`) and let the user delete a task or an empty status from the board.

## Gates (T3: all except a skipped one needs a reason)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [x] G4 run it (checked by owner before v0.4.0)  
- [x] G5 code review (fresh reviewer agent)  - [x] G6 security (fresh reviewer agent: path validation, literal pathspecs fixed)  - [x] G7 docs sync
- [x] G8 PR message  - [x] G9 human review (owner)  - [ ] G10 release plan (Skipped G10: shipped through the standard release workflow, no separate plan written)  - [x] G11 changelog

## Done when
- [x] `parse` reads `- **ID:**` into `Task.displayId`; `createTask` assigns max+1 across all columns; `_TEMPLATE.md` has the field
- [x] `assignIds(tasksDir)` backfills missing IDs once, never changes an existing ID, commits touched paths only (no `git add -A`); runs on first board open and is a no-op afterwards
- [x] ID shown on board cards, list rows and detail panel, and matched by the text filter
- [x] `deleteTask`: host confirm modal, `git rm` + pathspec commit when tracked, plain unlink otherwise; respects `gitask.autoCommit`
- [x] `deleteColumn`: refused with a clear message if the folder has any task; confirm; removes the empty folder
- [x] `protocol.ts` validates both new messages (path inside Tasks, column exists); tests cover rejects
- [x] Tests on real temp git repos: delete tracked, untracked, non-git, column with tasks refused, ID backfill idempotent, duplicate IDs handled
- [x] `Docs/requirements/views.md` updated
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Status (agent-task-id-delete, 2026-10-20)
- G2: `pnpm typecheck` clean. G3: `pnpm test` 115 pass / 0 fail (new: `packages/core/test/ids-delete.test.ts`, protocol tests). `pnpm build` ok.
- Skipped G4 (full): no VS Code host here; webview JS only built and loaded by existing shell tests, not clicked through. Needs a manual run in the Extension Development Host.
- Changed an existing test: `createTask fills the real template` now expects the `ID` line.
- Decisions: duplicate IDs: first in board order keeps it, later ones are renumbered. Delete with `autoCommit` off just unlinks (no `git rm`). Deleting a status removes a lone tracked `.gitkeep` (committed) and refuses any other file. Shared files edited additively: protocol.ts, extension.ts, board.ts, list.ts, list-logic.ts (new `displayId` column first), types.ts, parse.ts.

### Draft CHANGELOG entry
```
## 2026-10-20 · [Ext] feat(board): task ID, delete task, delete empty status
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-task-id-delete.md
- Branch/PR: feat/task-id-delete
- What changed: every task gets a `T-0001` ID (backfilled once, shown on cards, list, detail, searchable); delete a task (git rm + commit) from card or detail; delete an empty status.
- Needs: none
```

### Review fixes
- Git helpers run with `GIT_LITERAL_PATHSPECS=1` (file names like `Fix *.md`, `a[12].md` no longer match siblings). `deleteImpact` (core) drives a truthful delete dialog. `assignIds` skips tracked files with uncommitted edits and leaves non-`T-` IDs (`JIRA-123`) alone. Commit message templating uses a function replacer; `.DS_Store`/`Thumbs.db` ignored when deleting a status. Tests added in `ids-delete.test.ts`.
