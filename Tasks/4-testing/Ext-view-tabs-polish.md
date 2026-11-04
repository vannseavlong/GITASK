# Ext-view-tabs-polish

- **ID:** T-0076
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · UI polish on one component
- **Claimed by:** SNLRLONG (agent)
- **Worktree:** `GITASK/GITASK-view-tabs-polish/` · **Branch:** `fix/view-tabs-polish`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-view-order.md` (review findings)
- **Depends on:** Ext-project-header (both edit the shell)
- **Touches:** `packages/ui/src/shell/view-tabs.tsx`, `packages/ui/src/lib/view-order.ts`, tests

## Goal
Fix the review findings on the draggable tabs: pressing a tab to drag it must not switch the view; a drop on the gap, the strip or the Reset button should still land; Firefox (buttons cannot be dragged) gets a working path; keyboard moves are announced to screen readers; drop marker meets 3:1 contrast; component tests for drag, Alt+Arrow, focus and Reset.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (mock build, headless Chromium; Firefox and VS Code webview not run)
- [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] Dragging Timeline to the front does not change the active view or send a `view` message
- [x] `aria-live` message such as "Board moved to position 2 of 4" after Alt+Arrow
- [x] Reorder works via pointer events (verified in Chromium only; Firefox and the VS Code webview untested)
- [x] Tests cover drag, keyboard, focus return and Reset via pure helpers (no DOM test setup exists; focus return checked by hand in Chromium)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
