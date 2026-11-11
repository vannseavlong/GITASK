# Ext-sprint-complete

- **ID:** T-0096
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new dialog and messages that move many files at once (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-complete/` · **Branch:** `feat/sprint-complete`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Ext-sprint-planning
- **Touches:** `packages/core/src/protocol.ts`, `packages/vscode/src/extension.ts`, `packages/cli/src/handler.ts`, `packages/ui/src/views/sprint.tsx`, new `packages/ui/src/components/complete-sprint-dialog.tsx`, tests, `Docs/architecture/ui.md`, `Docs/requirements/sprints.md`, new `packages/web/docs/sprints.md` (user guide), web sidebar

## Goal
Close a sprint from the board: see what is done, choose per unfinished task Backlog or Next sprint, confirm, and start planning the next sprint.

G6 applies: a single confirmed message moves many files.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] "Complete sprint" on the Sprint tab and the strip (active sprint only) opens the dialog; the host sends `sprintClosePlan` → `sprintClosePlanResult {plan, planHash}`
- [ ] Dialog: summary tiles, unfinished tasks with an action select and "Apply to all", "Reset status to todo", warnings for claimed tasks and for creating the next sprint
- [ ] `completeSprint {id, actions, resetStatus, planHash, confirmed: true}` refused without `confirmed`, with a stale hash or with unknown paths; success returns the summary, failure says nothing changed
- [ ] Success screen offers "Plan next sprint" (Sprint tab scoped to the new or next sprint)
- [ ] User guide `packages/web/docs/sprints.md`: turn on, plan, run, complete (backlog vs next)
- [ ] Checked in a real VS Code window and in `gitask serve`: close with tasks going both ways, then plan the next sprint
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
