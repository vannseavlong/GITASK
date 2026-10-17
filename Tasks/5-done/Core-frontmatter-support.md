# Core-frontmatter-support

- **Repo:** <repo>
- **Owner:** SNLRLONG
- **Tier:** T1
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-frontmatter/` · **Branch:** `feat/frontmatter`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** <links>
- **Depends on:** <request item, other task, or none>
- **Touches:** packages/core/src/parse.ts, index.ts, test/frontmatter.test.ts

## Goal
Also parse YAML frontmatter in task files; keep the folder as the status source.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Tests for both formats
Skipped G4-G11: T1, core-only parser change covered by tests; changelog/PR left to the human.
