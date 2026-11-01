# Core-test-isolate-git-repo

- **ID:** T-0060
- **Repo:** GITASK
- **Owner:** Owner
- **Tier:** T1 · test-only change, no behaviour change (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-<short-name>/` · **Branch:** `feat/<short-name>`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** <YYYY-MM-DD, optional>
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/cli/test/find-tasks.test.ts`

## Goal
Make the test "outside a git repo only the current folder is checked" independent of the host: it fails whenever a stray `/tmp/.git` exists because the temp folder is treated as inside a git repo.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Test passes with a stray `.git` in the parent temp directory (set `GIT_CEILING_DIRECTORIES` or create the fixture under a fresh directory)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
