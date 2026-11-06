# Core-field-values

- **ID:** T-0085
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · parser and filter logic in shared core (auto picker, see `PIPELINE.md`)
- **Claimed by:** Claude (session 334c0cd4), 2026-11-07
- **Worktree:** `GITASK/GITASK-Core-field-values/` · **Branch:** `feat/Core-field-values`
- **Started / updated:** 2026-11-07 / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** Core-config-fields
- **Touches:** `packages/core/src/parse.ts`, `subtasks.ts`, `types.ts`, `packages/ui/src/shell/logic.ts` (filter fn), `packages/vscode/src/*-filter.ts`, tests

## Goal
Resolve task header values (`- **Platform:** app, admin-portal`) and sub-task `#platform:app` tokens against the config into `Task.values` / `Subtask.values`; add `setTaskField` / `setSubtaskField` writers (commit by pathspec); add a pure `filterByFields` (AND across fields, OR within; a task matches via itself or any sub-task). Plain `#lane` tokens keep working.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [x] G4 run it (real temp git repos; no UI in this task)
- [x] G5 code review (fresh agent: 1 high, 1 medium fixed/documented)  - [x] G6 security (same agent; injection, regex, prototype keys checked)  - [x] G7 docs sync (`Docs/architecture/config.md`, `Docs/requirements/views.md`; web guide with Ext-field-filter)
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] Old task files (one documented exception: a sub-task ending in `#word:word`) parse exactly as before (lane tests unchanged)
- [x] `#platform:app` round-trips through add/set/remove sub-task; unknown id kept and flagged
- [x] `filterByFields` tested for AND/OR and the sub-task rollup
- [x] `Docs/architecture/config.md` updated (G7)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
