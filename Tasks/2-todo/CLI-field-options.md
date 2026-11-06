# CLI-field-options

- **ID:** T-0087
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · CLI flags over finished core API (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-CLI-field-options/` · **Branch:** `feat/CLI-field-options`
- **Started / updated:** none / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** Core-field-values
- **Touches:** `packages/cli/src/commands.ts`, `main.ts`, `handler.ts`, `packages/core/src/report.ts`, `packages/cli/test/`, `packages/cli/README.md`

## Goal
`gitask add --platform app`, `gitask list --platform app`, and a `--by platform` grouping in reports, driven by the config; unknown ids refused with the allowed list in the message.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (existing pass)  - [ ] G4 run it
- [ ] G7 docs sync  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] CLI tests on a real temp git repo cover add, list and report with a configured field
- [ ] `Docs/architecture/config.md` updated (G7)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
