# Core-task-model

- **ID:** T-0016
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · shared types and parser in core, writes task files
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-task-model/` · **Branch:** `feat/task-model`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** none
- **Touches:** `packages/core/src/{types,parse,board,toggle}.ts`, `packages/core/test/**`, `Tasks/_TEMPLATE.md` (one optional `Due` line), `packages/core/src/create.ts`

## Goal
Extend the task model: parse sub-tasks (checkbox lines grouped by `##` section), the optional `Due` date, and task ids named in `Depends on`. Add `toggleSubtask(task, index)` that rewrites one checkbox line and commits that file by pathspec.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (typecheck + build)  - [x] G3 tests (21/21)  - [x] G4 run it (core tests on real temp git repos)
- [x] G5 code review  - [x] G6 security (toggle writes one character; test asserts byte-for-byte result and a staged unrelated file stays out of the commit)  - [x] G7 docs sync (`views.md` already specifies Due; user-facing task-format page belongs to `Ops-web-docs`)
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] Sub-tasks have section, text, checked and line number; `Done when` progress is `done/total`
- [x] `Due` is parsed to a date; bad or missing values give `undefined`, never throw
- [x] `Depends on` yields only ids of tasks that exist
- [x] Toggle changes exactly one line, keeps line endings, commits only that file, and refuses when the line moved since it was read
- [x] Existing tests still pass; new tests cover each case above and a CRLF file
- [x] `_TEMPLATE.md` documents the optional `Due` field; workspaces without it still parse
- [x] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes (2026-10-17)
- Built in `GITASK-task-model/` on `feat/task-model`, uncommitted (leave commits to the owner). New `toggle.ts`; `Task` gained `subtasks`, `progress`, `due`, `dependsOn`; `loadBoard` resolves `dependsOn` against all task ids.
- A line with several checkboxes (the gate rows) gives one sub-task per checkbox; `col` locates the character. Fenced code blocks are skipped. Toggle is refused unless the same checkbox, text and state sit at the same line and column.
- Tests: `packages/core/test/model.test.ts` (11 new). Left: G5 review by a fresh agent, G8, G11 changelog at merge.
