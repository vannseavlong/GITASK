# Core-sprint-model

- **ID:** T-0091
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in shared core types and parser (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-model/` · **Branch:** `feat/sprint-model`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** none
- **Touches:** `packages/core/src/types.ts`, `parse.ts`, `board.ts`, `field-rules.ts` (reserve `sprint`, `estimate`), new `packages/core/src/sprints.ts`, `index.ts`, core tests, `Docs/architecture/config.md` (`sprint` block), new `Docs/architecture/sprints.md`

## Goal
Read sprints: the `sprint` block of `Tasks/gitask.json`, sprint files in `Tasks/_sprints/S<n>.md`, and the `Sprint` / `Estimate` task headers, into the board payload. Read only; nothing writes yet.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `parseSprintConfig` / `readSprintConfig`: defaults and per-key validation as in the plan table; no block means sprints off (`Board.sprints` absent)
- [ ] `readSprints(dir)`: parses `_sprints/*.md` (regular files only, same symlink guard as tasks): id `S<n>`, name, state `planned|active|closed`, start, end, goal, capacity; bad values dropped one by one, never throws
- [ ] `Task.sprint` and `Task.estimate` (number >= 0, max 2 decimals) parsed from the header; `sprint` and `estimate` added to `RESERVED_FIELD_KEYS`
- [ ] `Board.sprints = { config, list, active? }`; two sprints marked active → the lowest id wins and a warning is returned
- [ ] Tests on real temp git repos: config off/on/malformed, sprint file edge cases, task headers, `_sprints` never becomes a column
- [ ] `Docs/architecture/config.md` lists `sprint`; `Docs/architecture/sprints.md` holds the file format
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
