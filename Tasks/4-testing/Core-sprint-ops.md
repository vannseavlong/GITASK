# Core-sprint-ops

- **ID:** T-0092
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature, bulk file moves and commits in core (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-ops/` · **Branch:** `feat/sprint-ops`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-model
- **Touches:** new `packages/core/src/sprint-ops.ts`, `index.ts`, core tests, `Docs/architecture/sprints.md`. Reuses `move.ts`, `taskedit.ts` (`editHeaderField`), `git.ts` without changing them; if a change is needed there, note it in the task file

## Goal
All sprint writes in core: create, edit, start, add/remove a task, set an estimate, and close a sprint with the unfinished tasks sent to the backlog or the next sprint. All-or-nothing, committed by pathspec.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] `createSprint` (next `S<n>`, dates from `lengthDays`), `updateSprint`, `startSprint` (only one active; sets Start/End when empty)
- [x] `setTaskSprint(task, id|null)` and `setEstimate(task, n|null)` edit one header line and commit that file
- [x] `planSprintClose(board, id, actions?, resetStatus?)` is pure: lists done tasks (in `doneColumns`), unfinished tasks with their action (default from config), target folders, name clashes, claimed-task warnings, whether the next sprint must be created, and a `planHash`
- [x] `applySprintClose(dir, plan, planHash)`: re-plans and refuses a stale hash; checks everything before writing; backlog = git mv to `1-backlog/` + remove `Sprint`; next = set `Sprint: S<n+1>` (created if missing) + optional move to `resetStatus`; writes `## Summary` and `State: closed`; one commit by pathspec; on any failure reverses moves and edits already done
- [x] Done tasks are never moved or edited by a close
- [x] Edge-case tests: empty sprint, all done, clash in the target folder, untracked files, autoCommit off, failure halfway (files restored), stale hash, closing a non-active sprint refused
- [x] Never `git add -A`; commit subject `sprint(S7): complete, 8 done, 3 to backlog, 1 to S8`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Gate results (2026-11-12, commit `5f843fa` on `feat/sprint-ops`, based on `integration/sprints`)
- G1 scope: `git diff --stat integration/sprints` = `packages/core/src/sprint-ops.ts` (new), `packages/core/test/sprint-ops.test.ts` (new), `packages/core/src/index.ts`, `packages/core/src/taskedit.ts` (+15, see Notes), `Docs/architecture/sprints.md`. No ui/vscode/protocol files.
- G2: `pnpm typecheck` clean, `pnpm build` ok.
- G3: `pnpm test` 540/540 pass; 23 new in `sprint-ops.test.ts` on real temp git repos: create/update/start rules, set/remove Sprint and Estimate lines, plan purity + hash stability, empty sprint, all done, clash in target folder, untracked files, autoCommit off, failure halfway (read-only file mid-loop) and failing pre-commit hook (files and index restored, HEAD unchanged), stale hash, non-active sprint refused, missing `doneColumns`/`resetStatus` columns.
- G4: script on a temp repo (create S1, add 3 tasks + estimates, start, finish one, complete with one `backlog` and one `next`): one commit `sprint(S1): complete, 1 done, 1 to backlog, 1 to S2` touching both move sources/targets, `_sprints/S1.md` (closed + Summary) and new `_sprints/S2.md`; clean `git status`.
- G7: `Docs/architecture/sprints.md` gains a "Writing" section (API, rules, close plan/apply, rollback).
- G5 (lead session, read cold, strict on applySprintClose): re-plan + hash before any write; every source checked and read first; undo journal covers move, write and create, restored newest first, index reset by pathspec; one commit by pathspec incl. move sources; done tasks never in the work list. No findings.
- G6: request `actions` keys are only matched against the sprint's own unfinished task paths (anything else is a blocker), target paths are built from board columns, never from the request; ids checked by regex; text via `cleanText`; new sprint file written with `wx`. No findings.

## Notes
- `taskedit.ts`: added exported `removeHeaderField(content, name)` (15 lines). Removing a header line needs the private `Doc`/`bounds` helpers there (frontmatter, first `##`, per-line CRLF); `editHeaderField(..., "")` only blanks the value. No existing function changed.
- Reviewer note handled: `planSprintClose` checks `doneColumns` (none existing = blocker, some missing = warning) and `resetStatus` (config value missing = fall back to keep status with a warning; explicit value missing or a done status = blocker).
- `applySprintClose` rollback resets the touched paths in the index to `HEAD`; a pre-staged change on a touched file is unstaged (content kept).

