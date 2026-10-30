# Ext-ui-assign

- **ID:** T-0041
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in UI over core people API (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-assign/` · **Branch:** `feat/ui-assign`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Ext-ui-views
- **Touches:** packages/ui/src/components/assignee-*.tsx, board card, detail, filter bar, protocol (`setOwner` message)

## Goal
Assign a task to a contributor from a searchable list with avatars (initials), and filter every view by person.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] Combobox on the card menu and in the detail panel lists contributors from `people`, with "Unassigned"
- [ ] `setOwner` webview message validated (known person id or null) and committed by pathspec
- [ ] "People" multi-select in the filter bar combines with date and text filters in all four views
- [ ] Empty state when the repo has no history yet: type a name to add a person
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
