# CLI-sprint

- **ID:** T-0094
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new CLI commands over new core writes (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-cli-sprint/` · **Branch:** `feat/cli-sprint`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** `Tasks/_plans/Ext-scrum-sprints.md`
- **Depends on:** Core-sprint-ops
- **Touches:** `packages/cli/src/main.ts` (usage and dispatch), `packages/cli/src/commands.ts`, cli tests, `packages/cli/README.md`, `packages/web/docs/cli.md`

## Goal
Sprint commands for scripts, CI and agents.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [x] G4 run it
- [x] G5 code review  - [x] G6 security  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] `gitask sprint list [--json]`, `sprint new [--name] [--goal] [--start] [--end] [--capacity]`, `sprint start <id>`
- [x] `gitask sprint add <task> [sprint]` (default: the active or newest planned sprint), `sprint remove <task>`, `gitask estimate <task> <n|none>`
- [x] `gitask sprint complete <id> [--unfinished backlog|next] [--keep-status] [--dry-run] --yes`: prints the plan; applies only with `--yes`
- [x] `gitask board --sprint <id|active|backlog>`
- [x] Non-zero exit on unknown sprint or task, invalid dates or numbers, sprints off; help text and docs updated
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Gate results (2026-11-12, commit `c605de0` on `feat/cli-sprint`)
- **G1 scope:** `git diff --stat integration/sprints`: `packages/cli/README.md`, `packages/cli/src/{commands,main,sprint-commands}.ts`, `packages/cli/test/sprint-cli.test.ts`, `packages/web/docs/cli.md` (6 files, +530/-9). New file `sprint-commands.ts` instead of growing `commands.ts`. It imports (does not edit) the pure `packages/vscode/src/sprint-scope.ts` (`scopeBoard`, `sprintStats`, `estimateUnit`) so `board --sprint backlog` uses the same rule as the UI switcher; `handler.ts` already imports from `vscode/src` the same way.
- **G2 static:** `pnpm typecheck` clean; `pnpm build` ok.
- **G3 tests:** `pnpm test` 557/557 pass; new `packages/cli/test/sprint-cli.test.ts` (6 tests, real temp git repos): new/list/start/add/remove/estimate with commit subjects and an unrelated dirty file never committed; `board --sprint` active/backlog/unknown; errors (sprints off, bad dates, End before Start, bad numbers, unknown sprint/task, no default sprint, bad subcommand) exit non-zero and commit nothing; complete without `--yes` / with `--dry-run` changes nothing; `--keep-status`; `--next`/`--backlog` overrides; `--yes` makes one commit and creates S2; completing a closed sprint is blocked (exit 1); `--no-commit`.
- **G4 run it:** built `packages/cli/dist/gitask.js` on a temp repo (tasks committed). Key output:
```text
$ gitask sprint new --name "Sprint one" --goal "Ship login" --capacity 10
created S1: Sprint one (planned, no dates) (committed)
$ gitask sprint add T-0002
Core-api: sprint S1 (committed)
$ gitask estimate Core-api 5
Core-api: estimate 5 (committed)
$ gitask sprint start S1
S1: started (2026-11-12 → 2026-11-25) (committed)
$ gitask board --sprint active
S1 · Sprint one (active, 2026-11-12 → 2026-11-25) · 1/3 tasks · 3/8 (capacity 10) pts
Goal: Ship login
todo (2)
  --  Core-api  (5)
  --  Core-docs
done (1)
  --  Core-login  (3)
$ gitask sprint complete S1 --unfinished next --backlog Core-docs
Complete S1 · Sprint one (active)
Committed: 3 tasks · 8 pts   Done: 1 · 3 pts
Done (1): stay where they are
  T-0001  Core-login  [5-done]  3 pts
Unfinished (2):
  T-0002  Core-api  next (S2), stays in 2-todo  5 pts
  T-0003  Core-docs  backlog, 2-todo → 1-backlog
warning: Sprint S2 will be created
Dry run: nothing was changed. Add --yes to apply.   [exit 0]
$ gitask sprint complete S1 --unfinished next --backlog Core-docs --yes
...
Completed S1: 1 done, 1 to backlog, 1 to S2 (created S2)
committed: sprint(S1): complete, 1 done, 1 to backlog, 1 to S2
$ gitask sprint complete S1 --yes
blocked: Sprint S1 is closed; only the active sprint can be completed
Sprint S1 cannot be completed (1 blocker); nothing was changed.   [exit 1]
$ gitask sprint start S9
Unknown sprint "S9". Sprints: S1, S2   [exit 1]
```
  `git status` clean afterwards; log: `sprint(S1): create`, `task(...): sprint S1` x3, `task(...): estimate` x2, `sprint(S1): start`, `sprint(S1): complete, ...`.
- **G7 docs:** `packages/web/docs/cli.md` (new Sprints section, close options, exit codes; marked "coming in the next release"), `packages/cli/README.md`, CLI `help` text. `Docs/architecture/sprints.md` needs no change (core behaviour unchanged). Docusaurus build not run.
- G5 (lead session, read cold): thin layer over core; complete plans first, refuses on blockers, applies only with --yes and passes the plan hash, so a changed board is refused by core. No findings.
- G6: arguments checked before writes (dates, numbers, sprint ids, actions); task args resolved against the board only; output has titles and ids, no file contents or paths in --json. No findings. G8/G9/G11 at merge.

## Notes
- Extras beyond Done-when: `sprint complete active`, per-task `--next <task>` / `--backlog <task>` (repeatable), `--no-commit` on every sprint command, task argument also accepts the `ID` header (`T-0002`) for sprint/estimate commands only.
- `gitask estimate` works with sprints off (core `setEstimate` allows it).
- Not built: `sprint edit` (core `updateSprint` exists), `--json` on `sprint complete`, `--reset-status <column>`.

