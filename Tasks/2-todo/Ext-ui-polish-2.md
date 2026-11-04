# Ext-ui-polish-2

- **ID:** T-0081
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · two UI components, no shared logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-polish-2/` · **Branch:** `fix/ui-polish-2`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Docs/architecture/manual-testing.md` (found while running it)
- **Depends on:** none
- **Touches:** `packages/ui/src/views/overview-charts.tsx` (ActivityHeatmap), `packages/ui/src/components/subtasks.tsx`, tests

## Goal
Two fixes from the first manual run. (1) The Activity heatmap is a fixed-size SVG, so it leaves empty space on a wide card, scrolls on a narrow one, and clips the last month label ("No" instead of "Nov"). Make it fill the card and scale: wider cards get bigger cells, narrow cards keep a readable minimum and scroll, labels never clip. (2) Remove the "Split into backend / UX/UI / frontend" button and its template from the task detail: sub-tasks are added by hand.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] The heatmap fills the full card width at 320, 600, 1000 and 1800 px wide (look at the mock build in headless Chromium), cell size scales with width and keeps the aspect ratio, no clipped month or weekday label, the legend and caption still sit under it
- [ ] Hover tooltip and the data table for screen readers still work
- [ ] The split button, `SPLIT_TEMPLATE` and any test for it are gone; adding, ticking, assigning and lane still work
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
