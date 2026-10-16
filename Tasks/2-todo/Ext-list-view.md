# Ext-list-view

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-list-view/` · **Branch:** `feat/list-view`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/list.ts`

## Goal
A table of every task: title, status, tier, owner, claimed by, updated, due, progress. Sort by any column, filter by status/tier/owner, search by text, click to open the detail.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (F5)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: no new input path beyond the shell's validated messages)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] Sorting is stable and sorts dates and progress as values, not text
- [ ] Filters and search combine; an empty result shows a clear empty state
- [ ] Keyboard: arrows move rows, Enter opens, headers sort
- [ ] Sort and filter state survives a view switch
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
