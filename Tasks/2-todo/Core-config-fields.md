# Core-config-fields

- **ID:** T-0084
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new config block, shared core types (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-Core-config-fields/` · **Branch:** `feat/Core-config-fields`
- **Started / updated:** none / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** none
- **Touches:** `packages/core/src/config.ts` (or new `fields-config.ts`), `types.ts`, `board.ts`, `index.ts`, `packages/core/test/`

## Goal
Read and validate the `fields` block of `Tasks/gitask.json` (key, label, values with id/label/color, multi) and expose it as `Board.config.fields`. Missing or malformed block yields none; one bad entry is dropped alone; unknown keys are kept on write. Rules are in the plan's "Data and API".

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review (fresh agent)  - [ ] G6 security (config is untrusted input)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Valid block parses; every invalid case (reserved key, duplicate, bad colour, over limits, prototype-pollution keys like `__proto__`) is dropped without affecting others
- [ ] Board without `fields` is byte-identical to today in tests
- [ ] `Docs/architecture/config.md` updated (G7)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
