# Ext-ui-subtasks

- **ID:** T-0042
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in UI over core sub-task API (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-subtasks/` · **Branch:** `feat/ui-subtasks`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-subtask-assignee, Ext-ui-views
- **Touches:** packages/ui/src/components/subtasks-*.tsx, card, detail, protocol (`addSubtask`, `setSubtaskAssignee`)

## Goal
Jira-style sub-tasks: break a task into sub-tasks, each with an assignee and a lane; the List expands a task into its sub-task rows and a Board card opens to show them with assignees.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] List view: chevron expands a task inline into sub-task rows (tick, text, assignee avatar, lane); expand state remembered; expand all / collapse all
- [ ] Board: a card has an expand toggle that shows its sub-tasks with assignee and tick without leaving the board; opening the card shows the same list
- [ ] Detail panel: add, rename, tick, assign, set lane; one click to split a task into backend / UX/UI / frontend from a template
- [ ] Card shows stacked avatars and `done/total` including sub-tasks
- [ ] Filtering by person matches a task when the person owns the task or any of its sub-tasks
- [ ] Messages validated (index and line check as `toggleSubtask` does today)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
