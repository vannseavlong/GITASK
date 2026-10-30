# Ext-ui-assign

- **ID:** T-0041
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in UI over core people API (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-assign/` · **Branch:** `feat/ui-assign`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Ext-ui-views
- **Touches:** packages/ui/src/components/assignee-*.tsx, board card, detail, filter bar, protocol (`setOwner` message)

## Goal
Assign a task to a contributor from a searchable list with avatars (initials), and filter every view by person.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Combobox on the card menu and in the detail panel lists contributors from `people`, with "Unassigned"
- [ ] `setOwner` webview message validated (known person id or null) and committed by pathspec
- [ ] "People" multi-select in the filter bar combines with date and text filters in all four views
- [ ] Empty state when the repo has no history yet: type a name to add a person
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
