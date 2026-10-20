# Ext-date-filter

- **Repo:** gitask (`packages/vscode`)
- **Owner:** SNLRLONG
- **Tier:** T2 · edits shared webview shell and all four views, new feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/gitask-date-filter/` · **Branch:** `feat/date-filter`
- **Started / updated:** 2026-10-20 / 2026-10-20
- **Docs:** `Tasks/_plans/Ext-board-manage.md`, `Docs/requirements/views.md`
- **Depends on:** none
- **Touches:** new `packages/vscode/src/filter-logic.ts` (+test), `packages/vscode/src/html.ts` (shared filter bar), `packages/vscode/src/views/{board,list,timeline,overview}.ts` and their `*-logic.ts`. Shares `board.ts`, `list.ts` with Ext-task-id-delete and Ext-status-color: additive edits only.

## Goal
One date-range filter (from, to, and which date: due or updated) that applies the same way to Board, List, Timeline and Overview, and is remembered per view.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (skipped unless input handling changes: dates are validated `YYYY-MM-DD`)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Pure `filter-logic.ts` (no `vscode` import): `inRange(task, {from,to,field})`; unit tests for open ends, same-day, bad dates, tasks without a date
- [ ] Shared date inputs + clear button provided once through the shell API, not copied into each view
- [ ] All four views filter with it; counts, timeline bars and overview totals reflect the filtered set; "no tasks in range" empty state
- [ ] Existing text filter on Board/List still works and combines with the range
- [ ] Range saved in `api.state` per view and survives reload
- [ ] Verified in the running extension (G4) on this repo's `Tasks/`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
