# Core-people

- **ID:** T-0034
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new core module, adds Task/config fields, reads git history (names only are stored) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-people/` · **Branch:** `feat/people`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/core/src/people.ts (new), config.ts, types.ts, index.ts, core/test/people.test.ts

## Goal
List the people of a repo from git history (`git shortlog -sne` merged through `.mailmap`), keep a `people` list in `Tasks/gitask.json`, and assign/unassign a task `Owner` by pathspec commit.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] `listPeople(repoDir)` returns `{id, name}` sorted by commits; same person under two emails or spellings is merged via `.mailmap`; bot authors (`[bot]`) are excluded
- [ ] `Tasks/gitask.json` gains `people: [{id, name, github?, role?}]`; `github` defaults to the login in a `users.noreply.github.com` email, else unset; hand edits win over git; emails are never written to the file
- [ ] `setOwner(task, personId | null)` rewrites the `- **Owner:**` header line only and commits that path (never `git add -A`)
- [ ] Unknown or empty history yields an empty list, never throws
- [ ] Tests on real temp git repos: two emails one person, bot excluded, no commits, assign, unassign, owner line missing
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
