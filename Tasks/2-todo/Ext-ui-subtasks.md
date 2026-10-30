# Ext-ui-subtasks

- **ID:** T-0042
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in UI over core sub-task API (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-subtasks/` · **Branch:** `feat/ui-subtasks`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-subtask-assignee, Ext-ui-views
- **Touches:** packages/ui/src/components/subtasks-*.tsx, card, detail, protocol (`addSubtask`, `setSubtaskAssignee`)

## Goal
Jira-style sub-tasks: break a task into sub-tasks, each with an assignee and a lane; the List expands a task into its sub-task rows and a Board card opens to show them with assignees.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] List view: chevron expands a task inline into sub-task rows (tick, text, assignee avatar, lane); expand state remembered; expand all / collapse all
- [ ] Board: a card has an expand toggle that shows its sub-tasks with assignee and tick without leaving the board; opening the card shows the same list
- [ ] Detail panel: add, rename, tick, assign, set lane; one click to split a task into backend / UX/UI / frontend from a template
- [ ] Card shows stacked avatars and `done/total` including sub-tasks
- [ ] Filtering by person matches a task when the person owns the task or any of its sub-tasks
- [ ] Messages validated (index and line check as `toggleSubtask` does today)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
