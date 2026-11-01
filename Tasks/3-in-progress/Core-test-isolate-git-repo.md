# Core-test-isolate-git-repo

- **ID:** T-0060
- **Repo:** GITASK
- **Owner:** Owner
- **Tier:** T1 · test-only change, no behaviour change (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-<short-name>/` · **Branch:** `feat/<short-name>`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-03
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/cli/test/find-tasks.test.ts`

## Goal
Make the test "outside a git repo only the current folder is checked" independent of the host: it fails whenever a stray `/tmp/.git` exists because the temp folder is treated as inside a git repo.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static (tsc passes)  - [x] G3 tests (find-tasks: 4/4 pass, and 3 pass + 1 skip with a stray `.git` in the parent)  - [x] G4 run it (both cases run)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Test passes with a stray `.git` in the parent temp directory (it skips with the reason; no git-free fixture location exists in that case)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
