# Ext-sprint-scope

- **ID:** T-0093
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI feature, edits the shared shell and filter logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-scope/` · **Branch:** `feat/sprint-scope`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-model
- **Touches:** `packages/ui/src/shell/` (`App.tsx`, `logic.ts`, `filter-bar.tsx`, new `sprint-switcher.tsx`, new `sprint-strip.tsx`), `packages/ui/src/host/` types (`UiState.sprintScope`), `packages/vscode/src/filter-logic.ts` if `derive` lives there, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md` (new). Not `protocol.ts`: no new messages

## Goal
A sprint switcher (Active sprint · a chosen sprint · Backlog · All) that scopes all four views, plus a strip showing the sprint goal, dates, days left and progress.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Hidden when `Board.sprints` is absent; nothing changes for teams without sprints
- [ ] Scope stored in `UiState` (never committed); default is the active sprint when one exists, else All; an unknown or deleted sprint falls back to All
- [ ] Scope combines with the text, date, people, field and status filters in the same `derive` step (AND); the `N of M match` line counts it
- [ ] Strip: name, goal, `start – end · N days left` (or `ended N days ago` in warning colour), `done/total tasks` and points when `estimate` is not `none`
- [ ] Backlog scope = tasks with no `Sprint` that are not in a done status
- [ ] Card, list row and detail show a small sprint badge and the estimate
- [ ] Tests for the scope logic; `Docs/requirements/sprints.md` started (switcher and strip)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
