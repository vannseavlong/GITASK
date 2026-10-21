# Ops-github-remote

- **ID:** T-0025
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · outward-facing
- **Claimed by:** none
- **Worktree:** `GITASK/<repo>-<short-name>/` · **Branch:** `feat/<short-name>`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** <links>
- **Depends on:** <request item, other task, or none>
- **Touches:** <main files/areas, to spot overlap with other worktrees>

## Goal
Create the GitHub repo and push, then confirm ci.yml and changelog.yml run green. Ask the owner before creating or pushing.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (GitHub Actions API, 2026-10-17: latest `ci` runs on main and feat/web-scaffold = success; `changelog` on main = success)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Owner approves repo name and visibility
- [x] CI green
- [x] changelog workflow tested by moving a task to 5-done

## Notes (2026-10-17)
- Repo `vannseavlong/GITASK` exists and is pushed; `origin/main` is current. Closed by the owner pushing and merging PRs; nothing left to build.
