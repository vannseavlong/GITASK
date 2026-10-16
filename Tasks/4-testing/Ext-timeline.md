# Ext-timeline

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen, date math
- **Claimed by:** timeline agent (Claude), 2026-10-17
- **Worktree:** `GITASK/GITASK-timeline/` · **Branch:** `feat/timeline`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/timeline.ts`, `packages/core/src/schedule.ts` (new, pure)

## Goal
Calendar and waterfall. Calendar: month grid with due dates. Waterfall: one bar per task from Started to Due, arrows from `Depends on`, a today line, zoom by week or month. Tasks without `Due` get an open-ended bar.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it (F5) (NOT DONE: agent cannot open VS Code; human must F5)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: read-only)  - [x] G7 docs sync (no user docs changed)
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] `schedule` (lives in `packages/vscode/src/views/timeline-logic.ts`, not core; bar start/end, overlap, arrows) is pure and unit-tested, including no dates, due before start and month/year boundaries
- [x] A dependency cycle is drawn without hanging or crashing (tested at layout level)
- [x] Done tasks stop growing at their last-updated date
- [ ] Horizontal scroll with a sticky task-name column; works at 500 tasks
- [x] Time zones: dates are calendar dates, not instants, so no off-by-one day
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Verified: typecheck, `pnpm test` (55 pass: 38 before + 17 new in `test/timeline.test.ts`), build, package. Not verified: F5 rendering (calendar, waterfall, sticky column, themes, keyboard, 500 tasks in a real DOM); the client JS is only parse-checked and its logic half is run in a vm.
- Logic is `timelineLogic()` factory in `src/views/timeline-logic.ts`; the webview embeds `timelineLogic.toString()`. Kept in vscode package instead of `core/src/schedule.ts` because it is view layout (pixels); move later if the CLI needs it.
- Task with no Started falls back to last-updated, then Due; no date at all is listed in a note, not drawn. Due before Started draws a flagged bar spanning both days.
- Click calls `GITASK.openDetail(path)` only if defined.
- Edited `test/shell.test.ts` (placeholder assertion skips timeline); other view agents will touch the same line.
