# Ext-ui-polish-2

- **ID:** T-0081
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · two UI components, no shared logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none (released on move to testing)
- **Worktree:** `GITASK/GITASK-ui-polish-2/` · **Branch:** `fix/ui-polish-2`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Docs/architecture/manual-testing.md` (found while running it)
- **Depends on:** none
- **Touches:** `packages/ui/src/views/overview-charts.tsx` (ActivityHeatmap), `packages/ui/src/components/subtasks.tsx`, tests. Extra: `packages/vscode/src/subtask-logic.ts` (remove `SPLIT_TEMPLATE`, only user was the button)

## Goal
Two fixes from the first manual run. (1) The Activity heatmap is a fixed-size SVG, so it leaves empty space on a wide card, scrolls on a narrow one, and clips the last month label ("No" instead of "Nov"). Make it fill the card and scale: wider cards get bigger cells, narrow cards keep a readable minimum and scroll, labels never clip. (2) Remove the "Split into backend / UX/UI / frontend" button and its template from the task detail: sub-tasks are added by hand.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (existing, 440 pass)  - [x] G4 run it (mock, headless Chromium 320/600/1000/1800)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] The heatmap fills the full card width at 320, 600, 1000 and 1800 px wide (look at the mock build in headless Chromium), cell size scales with width and keeps the aspect ratio, no clipped month or weekday label, the legend and caption still sit under it
- [x] Hover tooltip (code unchanged; not hover-tested) and the data table for screen readers still work
- [x] The split button, `SPLIT_TEMPLATE` and any test for it are gone; adding, ticking, assigning and lane still work
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
