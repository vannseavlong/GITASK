# CLI-commands

- **ID:** T-0044
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new CLI commands over core, edits main.ts (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-commands/` · **Branch:** `feat/commands`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** Core-people, Core-subtask-assignee, Core-done-report
- **Touches:** packages/cli/src/main.ts, cli tests, packages/cli README

## Goal
Expose the new core features in `gitask` so scripts, CI and managers can use them without the editor.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `gitask people` lists contributors; `gitask assign <task> <person|none>`; `gitask subtask add|assign <task> ...`
- [ ] `gitask report --from 2026-10-01 --to 2026-10-31 --people a,b --format html|md|csv --out report.html`
- [ ] Help text updated; exit codes non-zero on unknown task, person or column
- [ ] Tests drive the real binary on a temp repo
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
