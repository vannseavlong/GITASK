# Core-people

- **ID:** T-0034
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new core module, adds Task/config fields, reads git history (names only are stored) (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-people/` · **Branch:** `feat/people`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/core/src/people.ts (new), config.ts, types.ts, index.ts, core/test/people.test.ts

## Goal
List the people of a repo from git history (`git shortlog -sne` merged through `.mailmap`), keep a `people` list in `Tasks/gitask.json`, and assign/unassign a task `Owner` by pathspec commit.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `listPeople(repoDir)` returns `{id, name}` sorted by commits; same person under two emails or spellings is merged via `.mailmap`; bot authors (`[bot]`) are excluded
- [ ] `Tasks/gitask.json` gains `people: [{id, name, github?, role?}]`; `github` defaults to the login in a `users.noreply.github.com` email, else unset; hand edits win over git; emails are never written to the file
- [ ] `setOwner(task, personId | null)` rewrites the `- **Owner:**` header line only and commits that path (never `git add -A`)
- [ ] Unknown or empty history yields an empty list, never throws
- [ ] Tests on real temp git repos: two emails one person, bot excluded, no commits, assign, unassign, owner line missing
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
