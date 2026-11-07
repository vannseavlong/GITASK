# CLI-field-options

- **ID:** T-0087
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · CLI flags over finished core API (auto picker, see `PIPELINE.md`)
- **Claimed by:** Claude (session 334c0cd4), 2026-11-07
- **Worktree:** `GITASK/GITASK-CLI-field-options/` · **Branch:** `feat/CLI-field-options`
- **Started / updated:** 2026-11-07 / 2026-11-07
- **Docs:** `Tasks/_plans/Core-configurable-fields.md`, `Docs/architecture/config.md`
- **Depends on:** Core-field-values
- **Touches:** `packages/cli/src/commands.ts`, `main.ts`, `handler.ts`, `packages/core/src/report.ts`, `packages/cli/test/`, `packages/cli/README.md`, `packages/web/docs/` (new `fields.md` guide + sidebar, written with the docs-writer skill once users can use the feature)

## Scope note
The CLI has no `add` or `list` command, so the flags landed on the existing ones: `board --field`, `subtask add --field`, `report --field`, plus new `fields`, `field set` and `subtask field`. Grouping a report by a field (`--by`) was dropped: filtering covers the need and grouping changes the report layout (HTML, Markdown and CSV). It is not on the backlog yet.

## Goal
`gitask add --platform app`, `gitask list --platform app`, and a `--by platform` grouping in reports, driven by the config; unknown ids refused with the allowed list in the message.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (existing pass, 7 new)  - [x] G4 run it (the tests spawn the real CLI on temp git repos)
- [x] G7 docs sync (web `cli.md` and `custom-fields.md`, `packages/cli/README.md`, `Docs/architecture/config.md`)  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [x] CLI tests on a real temp git repo cover fields, board, field set, subtask field/add and report with a configured field
- [ ] `Docs/architecture/config.md` updated (G7)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
