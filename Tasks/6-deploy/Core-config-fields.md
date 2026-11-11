# Core-config-fields

- **ID:** T-0084
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new config block, shared core types (auto picker, see `PIPELINE.md`)
- **Claimed by:** Claude (session 334c0cd4), 2026-11-07
- **Worktree:** `GITASK/GITASK-Core-config-fields/` · **Branch:** `feat/Core-config-fields`
- **Started / updated:** 2026-11-07 / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** none
- **Touches:** `packages/core/src/config.ts` (or new `fields-config.ts`), `types.ts`, `board.ts`, `index.ts`, `packages/core/test/`
- **Web docs:** `packages/web/docs/` page for the `fields` block (docs-writer skill) is part of G7

## Goal
Read and validate the `fields` block of `Tasks/gitask.json` (key, label, values with id/label/color, multi) and expose it as `Board.config.fields`. Missing or malformed block yields none; one bad entry is dropped alone; unknown keys are kept on write. Rules are in the plan's "Data and API".

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [x] G4 run it (loadBoard on temp boards in tests; no UI in this task)
- [x] G5 code review (fresh agent: no high/medium findings)  - [x] G6 security (same agent; low: no byte cap on gitask.json, shared by all config readers, left for a separate task)  - [x] G7 docs sync (`Docs/architecture/config.md`; web guide comes with Ext-field-filter)
- [x] G8 PR message  - [x] G9 human review (optional)  - [x] G11 changelog

## Done when
- [x] Valid block parses; every invalid case (reserved key, duplicate, bad colour, over limits, prototype-pollution keys like `__proto__`) is dropped without affecting others
- [x] Board without `fields` is byte-identical to today in tests
- [x] `Docs/architecture/config.md` updated (G7)
- [x] Root `CHANGELOG.md` entry added
- [x] Worktree and branch removed after merge

## Result
Merged in #23 and released in v0.6.1. Worktree and branch removed 2026-11-12.
