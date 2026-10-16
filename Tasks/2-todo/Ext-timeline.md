# Ext-timeline

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen, date math
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-timeline/` · **Branch:** `feat/timeline`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/timeline.ts`, `packages/core/src/schedule.ts` (new, pure)

## Goal
Calendar and waterfall. Calendar: month grid with due dates. Waterfall: one bar per task from Started to Due, arrows from `Depends on`, a today line, zoom by week or month. Tasks without `Due` get an open-ended bar.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (F5)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: read-only)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] `schedule` (bar start/end, overlap, arrows) is pure and unit-tested, including no dates, due before start and month/year boundaries
- [ ] A dependency cycle is drawn without hanging or crashing
- [ ] Done tasks stop growing at their last-updated date
- [ ] Horizontal scroll with a sticky task-name column; works at 500 tasks
- [ ] Time zones: dates are calendar dates, not instants, so no off-by-one day
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
