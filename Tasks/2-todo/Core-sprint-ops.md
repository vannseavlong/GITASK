# Core-sprint-ops

- **ID:** T-0092
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature, bulk file moves and commits in core (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-ops/` · **Branch:** `feat/sprint-ops`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-model
- **Touches:** new `packages/core/src/sprint-ops.ts`, `index.ts`, core tests, `Docs/architecture/sprints.md`. Reuses `move.ts`, `taskedit.ts` (`editHeaderField`), `git.ts` without changing them; if a change is needed there, note it in the task file

## Goal
All sprint writes in core: create, edit, start, add/remove a task, set an estimate, and close a sprint with the unfinished tasks sent to the backlog or the next sprint. All-or-nothing, committed by pathspec.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `createSprint` (next `S<n>`, dates from `lengthDays`), `updateSprint`, `startSprint` (only one active; sets Start/End when empty)
- [ ] `setTaskSprint(task, id|null)` and `setEstimate(task, n|null)` edit one header line and commit that file
- [ ] `planSprintClose(board, id, actions?, resetStatus?)` is pure: lists done tasks (in `doneColumns`), unfinished tasks with their action (default from config), target folders, name clashes, claimed-task warnings, whether the next sprint must be created, and a `planHash`
- [ ] `applySprintClose(dir, plan, planHash)`: re-plans and refuses a stale hash; checks everything before writing; backlog = git mv to `1-backlog/` + remove `Sprint`; next = set `Sprint: S<n+1>` (created if missing) + optional move to `resetStatus`; writes `## Summary` and `State: closed`; one commit by pathspec; on any failure reverses moves and edits already done
- [ ] Done tasks are never moved or edited by a close
- [ ] Edge-case tests: empty sprint, all done, clash in the target folder, untracked files, autoCommit off, failure halfway (files restored), stale hash, closing a non-active sprint refused
- [ ] Never `git add -A`; commit subject `sprint(S7): complete, 8 done, 3 to backlog, 1 to S8`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
