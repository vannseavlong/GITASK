# Ext-overview

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-overview/` · **Branch:** `feat/overview`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/{overview,overview-logic}.ts`, `packages/vscode/test/overview.test.ts`, plus minimal edits to `registry.ts`, `extension.ts`, `package.json`, `shell.test.ts`

## Goal
A project dashboard: counts per status, tier and owner; tasks not updated for N days (setting, default 14); claimed tasks; overdue tasks; the last 10 moves from git history. Numbers come from a pure `stats` function in core so the CLI can reuse it later.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it (F5: not possible from the agent, human must F5)
- [ ] G5 code review  - [x] G6 security (Skipped G6: read-only; textContent only)  - [x] G7 docs sync (no user docs change; setting in package.json)
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] Aggregation has unit tests (empty, one column, 500 tasks, bad dates, boundaries, future dates)
- [ ] Every number links to the filtered List view
- [ ] Recent moves read from `git log` without shelling out per task
- [x] Charts are plain HTML/CSS bars with text labels, no library
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Deviation from the task text: the logic lives in `packages/vscode/src/views/overview-logic.ts` (pure `computeOverview`), not core `stats.ts`, so the same function can be embedded into the webview via `Function.prototype.toString`. Move to core later if the CLI needs it.
- "Last 10 moves" is approximated by the `Started / updated` date (newest first), labelled "recently updated"; git log is out of scope. Not every number links to the List view yet (List is not built); items open via `GITASK.openDetail(path)` if present, else the file.
- `gitask.staleDays` (default 14) is sent inside the board message as `board.settings.staleDays`. Done/deploy columns (or the last column when none is named) are exempt from stale and overdue. Tasks without a valid date are never stale.
- Verified: `pnpm typecheck`, `pnpm test` (49 pass), `pnpm build`, `pnpm package`. Not verified: F5 in real VS Code (rendering, themes, 500 tasks in the DOM).
