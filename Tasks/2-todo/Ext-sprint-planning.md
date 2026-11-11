# Ext-sprint-planning

- **ID:** T-0095
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new view and new webview messages (protocol, both hosts) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-planning/` · **Branch:** `feat/sprint-planning`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-ops, Ext-sprint-scope
- **Touches:** `packages/core/src/protocol.ts` (new messages), `packages/vscode/src/extension.ts` and `view-ids.ts`, `packages/core/src/config.ts` (`BOARD_VIEWS` + `sprint`), `packages/cli/src/handler.ts`, new `packages/ui/src/views/sprint.tsx`, `views/registry.tsx`, `components/new-task-dialog.tsx` (Sprint picker), new `components/sprint-dialog.tsx`, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md`

## Goal
A Sprint tab to plan and start a sprint: backlog beside the sprint, add or remove tasks, estimates, capacity, new/edit/start sprint.

G6 applies: new messages carry user input.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] View id `sprint` added to the UI registry, `VIEW_IDS` and `BOARD_VIEWS` together (existing tests keep them equal); tab hidden when sprints are off
- [ ] Backlog pane (search plus the existing filters) and sprint pane; add or remove by button and by drag, keyboard reachable
- [ ] Inline estimate edit; capacity bar (sum of estimates vs `Capacity`, over-capacity warning)
- [ ] New sprint / Edit sprint dialog (name, goal, dates, capacity) and Start sprint (planned only, refused while another is active)
- [ ] New task dialog gets an optional Sprint picker (defaults to the sprint in scope)
- [ ] Messages `createSprint`, `updateSprint`, `startSprint`, `setTaskSprint`, `setEstimate` validated in `protocol.ts` (ids against the board, number and date rules, text limits) in VS Code and `gitask serve`
- [ ] Empty states: no sprint yet, empty backlog, empty sprint
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
