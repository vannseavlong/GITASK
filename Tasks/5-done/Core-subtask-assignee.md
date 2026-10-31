# Core-subtask-assignee

- **ID:** T-0035
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · edits shared parser and Subtask type, new feature (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-subtask-assignee/` · **Branch:** `feat/subtask-assignee`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/core/src/parse.ts, toggle.ts, types.ts, new subtasks.ts, tests

## Goal
Let a task split into sub-tasks, each with its own assignee and optional lane (backend, UX/UI, frontend). A sub-task stays a checkbox line so every existing tool keeps working.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] Syntax decided in the plan: `- [ ] Build login API @snlrlong #backend` (`@person-id`, `#lane`), under a `## Sub-tasks` section
- [ ] `Subtask` gains `assignee?` and `lane?`; text shown without the tokens; a line with no tokens parses exactly as today
- [ ] `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane` edit only that line and commit by pathspec; `toggleSubtask` unchanged
- [ ] `progressOf` also counts `## Sub-tasks` (decision 2 in the plan); cards of old tasks show the same numbers as before
- [ ] Tests: tokens in code fences ignored, multiple checkboxes on one line (gate rows) untouched, CRLF kept, unknown `@id` kept as text
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
