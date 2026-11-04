# Ext-view-tabs-polish

- **ID:** T-0076
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · UI polish on one component
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-view-tabs-polish/` · **Branch:** `fix/view-tabs-polish`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-view-order.md` (review findings)
- **Depends on:** Ext-project-header (both edit the shell)
- **Touches:** `packages/ui/src/shell/view-tabs.tsx`, `packages/ui/src/lib/view-order.ts`, tests

## Goal
Fix the review findings on the draggable tabs: pressing a tab to drag it must not switch the view; a drop on the gap, the strip or the Reset button should still land; Firefox (buttons cannot be dragged) gets a working path; keyboard moves are announced to screen readers; drop marker meets 3:1 contrast; component tests for drag, Alt+Arrow, focus and Reset.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Dragging Timeline to the front does not change the active view or send a `view` message
- [ ] `aria-live` message such as "Board moved to position 2 of 4" after Alt+Arrow
- [ ] Reorder works in Firefox (pointer-based fallback or handle) and the VS Code webview
- [ ] Tests cover drag, keyboard, focus return and Reset
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
