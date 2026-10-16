# Ext-overview

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-overview/` · **Branch:** `feat/overview`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/overview.ts`, `packages/core/src/stats.ts` (new, pure)

## Goal
A project dashboard: counts per status, tier and owner; tasks not updated for N days (setting, default 14); claimed tasks; overdue tasks; the last 10 moves from git history. Numbers come from a pure `stats` function in core so the CLI can reuse it later.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (F5)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: read-only)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] `stats` has unit tests, including no tasks, no git history and a future date
- [ ] Every number links to the filtered List view
- [ ] Recent moves read from `git log` without shelling out per task
- [ ] Charts are plain HTML/SVG, no library
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
