# Core-sprint-model

- **ID:** T-0091
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature in shared core types and parser (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-sprint-model/` · **Branch:** `feat/sprint-model`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** none
- **Touches:** `packages/core/src/types.ts`, `parse.ts`, `board.ts`, `field-rules.ts` (reserve `sprint`, `estimate`), new `packages/core/src/sprints.ts`, `index.ts`, core tests, `Docs/architecture/config.md` (`sprint` block), new `Docs/architecture/sprints.md`

## Goal
Read sprints: the `sprint` block of `Tasks/gitask.json`, sprint files in `Tasks/_sprints/S<n>.md`, and the `Sprint` / `Estimate` task headers, into the board payload. Read only; nothing writes yet.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

Gate results (2026-11-12, commit `9998a40` on `feat/sprint-model`):
- G1: `git diff --stat integration/sprints` = 10 files, all in Touches plus `Docs/README.md` (one-line index link to `sprints.md`, asked for by the lead).
- G2: `pnpm typecheck` clean; `pnpm build` ok (cli + vscode bundles).
- G3: `pnpm test` 517/517 pass; new `packages/core/test/sprints.test.ts` (16 tests, real temp git repos): config off/on/malformed/per-key fallback/symlinked file, sprint file edge cases (bad names, bad values, End before Start, symlink, dangling link, folder named `S3.md`, oversized file, symlinked `_sprints`), two active sprints, task headers, reserved keys, `_sprints` never a column, payload unchanged when off.
- G4: built CLI `gitask board` on a temp git repo with a `sprint` block and `_sprints/S7.md` + `S8.md` (both active): columns shown, no `_sprints` column (CLI has no sprint output yet; that is CLI-sprint). A script calling `loadBoard` printed `Board.sprints` with config, both sprints, `active: "S7"`, one warning, and `Core-a` with `sprint: "S7", estimate: 3`; with `{}` as config the board keys were only `dir`, `columns`.
- G7: `Docs/architecture/config.md` row + `sprint` section; new `Docs/architecture/sprints.md`; link in `Docs/README.md`.
- G5 (lead session, read cold): parseHeader split keeps parseTask output identical; sprint fields set only when valid; per-key config fallback; nextSprintId and pickActiveSprint pure. No findings. Note for Core-sprint-ops: default `resetStatus`/`doneColumns` are not checked against columns at read time.
- G6: sprint files and config are untrusted input: regular-file and symlink guard (`assertRegularFile`), `MAX_TASK_BYTES` cap, id only from a strict file-name regex, text through `cleanText` with length caps, never throws. No findings.

## Done when
- [x] `parseSprintConfig` / `readSprintConfig`: defaults and per-key validation as in the plan table; no block means sprints off (`Board.sprints` absent)
- [x] `readSprints(dir)`: parses `_sprints/*.md` (regular files only, same symlink guard as tasks): id `S<n>`, name, state `planned|active|closed`, start, end, goal, capacity; bad values dropped one by one, never throws
- [x] `Task.sprint` and `Task.estimate` (number >= 0, max 2 decimals) parsed from the header; `sprint` and `estimate` added to `RESERVED_FIELD_KEYS`
- [x] `Board.sprints = { config, list, active? }`; two sprints marked active → the lowest id wins and a warning is returned
- [x] Tests on real temp git repos: config off/on/malformed, sprint file edge cases, task headers, `_sprints` never becomes a column
- [x] `Docs/architecture/config.md` lists `sprint`; `Docs/architecture/sprints.md` holds the file format
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
