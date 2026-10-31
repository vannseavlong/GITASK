# Ext-github-sync

- **ID:** T-0047
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · writes to a third party, notifies real people, uses auth tokens (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-github-sync/` · **Branch:** `feat/github-sync`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md` (section GitHub Issues and Projects)
- **Depends on:** Core-people, Core-subtask-assignee, Ext-ui-views
- **Touches:** packages/core/src/github.ts (new, fetch only, no SDK), config.ts (`github` block), packages/vscode/src/extension.ts (auth session), packages/cli/src/main.ts (one case), packages/ui sync button and dialog

## Goal
Opt-in link from a task to a GitHub issue so assigning in GITASK notifies the person through GitHub. Part of 0.5.0 (owner decision 2026-10-30): the release waits for it. Nothing else depends on it, so it can be built last.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new + edge cases)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review (strict)  - [x] G6 security  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [x] G11 changelog

## Done when
- [ ] Before building: confirm the current token scopes for Issues, sub-issues and Projects v2 in GitHub Docs and write them in `Docs/architecture/github.md`
- [ ] `Tasks/gitask.json` `github: {repo: "owner/name", project?: number}`; without it no GitHub call is ever made
- [ ] Task header `- **Issue:** #123`; "Sync to GitHub" creates or updates the issue (title, body link back to the task file, assignees from `Owner` via their `github` name); sub-tasks become sub-issues; optional Project status from the column
- [ ] Dry-run preview lists exactly what will be created or changed and which people will be notified; nothing is sent until the user confirms
- [ ] People without a `github` name are skipped with a visible warning, never guessed
- [ ] Auth: VS Code GitHub session in the extension, `GITHUB_TOKEN` in CLI/serve; token never logged, written to disk or sent to the UI
- [ ] Rate limits, 401, 403, 404 and offline give a clear message and leave the local task file unchanged
- [ ] Tests with a fake GitHub server (no real calls); one manual run on a throwaway repo proves the assignee receives a notification
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
- G9 human review: PENDING (T3). Task stays in `4-testing/` until the owner has reviewed it.
