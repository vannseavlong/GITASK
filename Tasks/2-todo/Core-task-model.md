# Core-task-model

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · shared types and parser in core, writes task files
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-task-model/` · **Branch:** `feat/task-model`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** none
- **Touches:** `packages/core/src/{types,parse,board,toggle}.ts`, `packages/core/test/**`, `Tasks/_TEMPLATE.md` (one optional `Due` line), `packages/core/src/create.ts`

## Goal
Extend the task model: parse sub-tasks (checkbox lines grouped by `##` section), the optional `Due` date, and task ids named in `Depends on`. Add `toggleSubtask(task, index)` that rewrites one checkbox line and commits that file by pathspec.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (core tests on real temp git repos)
- [ ] G5 code review  - [ ] G6 security (Skipped G6 unless the toggle writes anything but the one line)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] Sub-tasks have section, text, checked and line number; `Done when` progress is `done/total`
- [ ] `Due` is parsed to a date; bad or missing values give `undefined`, never throw
- [ ] `Depends on` yields only ids of tasks that exist
- [ ] Toggle changes exactly one line, keeps line endings, commits only that file, and refuses when the line moved since it was read
- [ ] Existing tests still pass; new tests cover each case above and a CRLF file
- [ ] `_TEMPLATE.md` documents the optional `Due` field; workspaces without it still parse
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
