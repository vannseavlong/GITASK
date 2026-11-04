# Ext-add-status

- **ID:** T-0082
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature: new message, core function that creates a folder, both hosts (auto picker, see `PIPELINE.md`)
- **Claimed by:** agent-a941d0ee (Claude), 2026-11-05
- **Worktree:** `GITASK/GITASK-add-status/` · **Branch:** `feat/add-status`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Docs/architecture/manual-testing.md` (found while running it)
- **Depends on:** none
- **Touches:** `packages/core/src/` (new create-column function, exported), `packages/core/src/protocol.ts` (new `addColumn` message and validation), `packages/vscode/src/extension.ts` and `packages/cli/src/handler.ts` (new case only), `packages/cli/src/main.ts` (optional `gitask status add`), `packages/ui/src/views/board.tsx` and a new dialog component, tests, `Docs/architecture/ui.md`, `packages/web/docs/task-format.md`

## Goal
There is no way to add a status column from the board; the only way is to create a numbered folder by hand. Add it: an "Add status" button on the board opens a small dialog (name, optional colour), core creates the next numbered folder (for example 7-review after 6-deploy) so it shows as a column immediately, and the new column is committed so it survives a clone (git does not track empty folders: look at how `init` keeps the six folders and do the same). Names are validated (letters, digits, spaces and hyphens become a safe folder slug; no traversal; no clash with an existing status; length cap). Position: append at the end by default; if a clean insert between two statuses is possible without renaming existing folders, offer "after <status>", otherwise say in the doc that reordering is done by renaming folders.

## Gates
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (mock build, headless Chromium)
- [x] G5 code review (cold self-review only)  - [x] G6 security (self-review + hostile-name tests)  - [x] G7 docs sync
- [ ] G8 PR message  - [x] G11 changelog

## Done when
- [ ] "Add status" on the board creates the column in VS Code and in `gitask serve`; it appears without reload; it is committed by pathspec only (the new folder placeholder), only when the project is a git repo and autoCommit is on
- [ ] Validation: empty, too long, duplicate (also case-insensitive), `..`, slashes, leading `_` (hidden folders) and non-ASCII are handled with a clear message in the dialog; the dialog stays open on error
- [ ] Optional colour is saved through the existing colour path
- [ ] Tests on a real temp git repo for the number choice (gaps, no gaps, many columns), validation, commit scope and clone survival; docs say how ordering works
- [ ] `gitask serve` and VS Code share the validation in core (one function)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Extra files touched: `packages/core/src/status-name.ts` (pure name rules, kept out of `add-column.ts` because `protocol.ts` is bundled into the webview and must not import node modules), `packages/core/src/add-column.ts`, `packages/core/src/index.ts`, `packages/ui/src/host/mock-host.ts`, `packages/ui/src/components/add-status-dialog.tsx`, `Docs/requirements/views.md`, `CHANGELOG.md`.
- Not done: the `gitask status add` CLI command (optional). The other "Done when" boxes stay unticked until a human checks them in a real VS Code webview and `gitask serve`.
