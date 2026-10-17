# Ext-list-view

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-list-view/` · **Branch:** `feat/list-view`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/{list,list-logic}.ts`, `packages/vscode/src/views/registry.ts` (one line), `packages/vscode/test/{list,shell}.test.ts`

## Goal
A table of every task: title, status, tier, owner, claimed by, updated, due, progress. Sort by any column, filter by status/tier/owner, search by text, click to open the detail.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (F5) (PARTIAL: no F5 possible from the agent; human must F5)
- [x] G5 code review  - [x] G6 security (Skipped G6: no new input path beyond the shell's validated messages)  - [x] G7 docs sync (no doc change needed)
- [x] G8 PR message  - [x] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] Sorting is stable and sorts dates and progress as values, not text
- [x] Filters and search combine; an empty result shows a clear empty state
- [x] Keyboard (untested at runtime): arrows move rows, Enter opens, headers sort
- [x] Sort and filter state survives (via api.state; untested at runtime) a view switch
- [ ] Works with an empty board, one column and 500 tasks (logic tested with 0 and 500 rows; DOM not run)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Verified: `pnpm typecheck`, `pnpm test` (51 pass: 21 core + 30 vscode, 13 new in `list.test.ts`), `pnpm build`, `pnpm package`. Not verified: F5 in real VS Code (rendering, themes, keyboard, 500 rows in the DOM).
- Logic lives in `src/views/list-logic.ts` as a plain-JS string (`LOGIC_SRC`); `list.ts` embeds it verbatim and the tests evaluate the same string.
- Row click calls `GITASK.openDetail && GITASK.openDetail(path)`; it does nothing until the detail panel lands. The row action "Open file" posts `open`.
- Arrow keys move row focus, Enter opens detail. `registry.ts` changed by one import and one line; `shell.test.ts` updated since list is no longer a placeholder.
