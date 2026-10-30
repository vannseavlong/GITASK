# Core-subtask-assignee

- **ID:** T-0035
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · edits shared parser and Subtask type, new feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-subtask-assignee/` · **Branch:** `feat/subtask-assignee`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/core/src/parse.ts, toggle.ts, types.ts, new subtasks.ts, tests

## Goal
Let a task split into sub-tasks, each with its own assignee and optional lane (backend, UX/UI, frontend). A sub-task stays a checkbox line so every existing tool keeps working.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Syntax decided in the plan: `- [ ] Build login API @snlrlong #backend` (`@person-id`, `#lane`), under a `## Sub-tasks` section
- [ ] `Subtask` gains `assignee?` and `lane?`; text shown without the tokens; a line with no tokens parses exactly as today
- [ ] `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane` edit only that line and commit by pathspec; `toggleSubtask` unchanged
- [ ] `progressOf` also counts `## Sub-tasks` (decision 2 in the plan); cards of old tasks show the same numbers as before
- [ ] Tests: tokens in code fences ignored, multiple checkboxes on one line (gate rows) untouched, CRLF kept, unknown `@id` kept as text
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
