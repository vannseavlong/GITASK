# Ext-github-sync

- **ID:** T-0047
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · writes to a third party, notifies real people, uses auth tokens (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-github-sync/` · **Branch:** `feat/github-sync`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md` (section GitHub Issues and Projects)
- **Depends on:** Core-people, Core-subtask-assignee, Ext-ui-views
- **Touches:** packages/core/src/github.ts (new, fetch only, no SDK), config.ts (`github` block), packages/vscode/src/extension.ts (auth session), packages/cli/src/main.ts (one case), packages/ui sync button and dialog

## Goal
Opt-in link from a task to a GitHub issue so assigning in GITASK notifies the person through GitHub. Part of 0.5.0 (owner decision 2026-10-30): the release waits for it. Nothing else depends on it, so it can be built last.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new + edge cases)  - [ ] G4 run it
- [ ] G5 code review (strict)  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Before building: confirm the current token scopes for Issues, sub-issues and Projects v2 in GitHub Docs and write them in `Docs/architecture/github.md`
- [ ] `Tasks/gitask.json` `github: {repo: "owner/name", project?: number}`; without it no GitHub call is ever made
- [ ] Task header `- **Issue:** #123`; "Sync to GitHub" creates or updates the issue (title, body link back to the task file, assignees from `Owner` via their `github` name); sub-tasks become sub-issues; optional Project status from the column
- [ ] Dry-run preview lists exactly what will be created or changed and which people will be notified; nothing is sent until the user confirms
- [ ] People without a `github` name are skipped with a visible warning, never guessed
- [ ] Auth: VS Code GitHub session in the extension, `GITHUB_TOKEN` in CLI/serve; token never logged, written to disk or sent to the UI
- [ ] Rate limits, 401, 403, 404 and offline give a clear message and leave the local task file unchanged
- [ ] Tests with a fake GitHub server (no real calls); one manual run on a throwaway repo proves the assignee receives a notification
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
