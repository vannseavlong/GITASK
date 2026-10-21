# Ext-date-filter

- **ID:** T-0010
- **Repo:** gitask (`packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T2 · edits shared webview shell and all four views, new feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-date-filter/` · **Branch:** `feat/date-filter`
- **Started / updated:** 2026-10-20 / 2026-10-21
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** new `packages/vscode/src/filter-logic.ts` (+test), `packages/vscode/src/html.ts` (shared filter bar), `packages/vscode/src/views/{board,list,timeline,overview}.ts` and their `*-logic.ts`. Shares `board.ts`, `list.ts` with Ext-task-id-delete and Ext-status-color: additive edits only.

## Goal
One date-range filter (from, to, and which date: due or updated) that applies the same way to Board, List, Timeline and Overview, and is remembered per view.

## Gates
- [x] G1 scope  - [x] G2 static (typecheck + build pass)  - [x] G3 tests (new, `packages/vscode/test/filter.test.ts`, 8 tests)  - [x] G4 run it (checked by owner before v0.4.0)  
- [x] G5 code review (fresh reviewer agent)  - [x] G6 security (skipped unless input handling changes: dates are validated `YYYY-MM-DD`)  - [x] G7 docs sync (`Docs/requirements/views.md`, section Date range filter)
- [x] G8 PR message  - [x] G9 human review (owner)  - [x] G11 changelog

## Done when
- [x] Pure `filter-logic.ts` (no `vscode` import): `inRange(task, {from,to,field})`; unit tests for open ends, same-day, bad dates, tasks without a date
- [x] Shared date inputs + clear button provided once through the shell API, not copied into each view
- [x] All four views filter with it; counts, timeline bars and overview totals reflect the filtered set; "no tasks in range" empty state
- [x] Existing text filter on Board/List still works and combines with the range
- [x] Range saved in `api.state` per view and survives reload
- [x] Verified in the running extension (G4) on this repo's `Tasks/`
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Notes
- Design: `filter-logic.ts` exports `FILTER_SRC` (tested string, embedded in the shell by `html.ts`). The shell draws the one filter bar and hands every view a pre-filtered board through `api.board` (so no view file was edited). Range lives in each view's `api.state.range`, persisted by `setState`.
- Tasks without a usable date are hidden while a range is active (per plan). Default date field is Due.

## Draft changelog entry (not added; root CHANGELOG.md left for merge)
```
## 2026-10-20 · [Ext] feat(views): date range filter
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-date-filter.md
- Branch/PR: feat/date-filter
- What changed: one From/To date filter (Due or Updated) on Board, List, Timeline and Overview, remembered per view; "No tasks in range." empty state
- Needs: none
```
