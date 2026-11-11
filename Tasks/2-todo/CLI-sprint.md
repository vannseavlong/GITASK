# CLI-sprint

- **ID:** T-0094
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new CLI commands over new core writes (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-cli-sprint/` · **Branch:** `feat/cli-sprint`
- **Started / updated:** none / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-ops
- **Touches:** `packages/cli/src/main.ts` (usage and dispatch), `packages/cli/src/commands.ts`, cli tests, `packages/cli/README.md`, `packages/web/docs/cli.md`

## Goal
Sprint commands for scripts, CI and agents.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `gitask sprint list [--json]`, `sprint new [--name] [--goal] [--start] [--end] [--capacity]`, `sprint start <id>`
- [ ] `gitask sprint add <task> [sprint]` (default: the active or newest planned sprint), `sprint remove <task>`, `gitask estimate <task> <n|none>`
- [ ] `gitask sprint complete <id> [--unfinished backlog|next] [--keep-status] [--dry-run] --yes`: prints the plan; applies only with `--yes`
- [ ] `gitask board --sprint <id|active|backlog>`
- [ ] Non-zero exit on unknown sprint or task, invalid dates or numbers, sprints off; help text and docs updated
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
