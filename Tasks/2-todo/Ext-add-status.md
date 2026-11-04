# Ext-add-status

- **ID:** T-0082
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new feature: new message, core function that creates a folder, both hosts (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-add-status/` · **Branch:** `feat/add-status`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Docs/architecture/manual-testing.md` (found while running it)
- **Depends on:** none
- **Touches:** `packages/core/src/` (new create-column function, exported), `packages/core/src/protocol.ts` (new `addColumn` message and validation), `packages/vscode/src/extension.ts` and `packages/cli/src/handler.ts` (new case only), `packages/cli/src/main.ts` (optional `gitask status add`), `packages/ui/src/views/board.tsx` and a new dialog component, tests, `Docs/architecture/ui.md`, `packages/web/docs/task-format.md`

## Goal
There is no way to add a status column from the board; the only way is to create a numbered folder by hand. Add it: an "Add status" button on the board opens a small dialog (name, optional colour), core creates the next numbered folder (for example 7-review after 6-deploy) so it shows as a column immediately, and the new column is committed so it survives a clone (git does not track empty folders: look at how `init` keeps the six folders and do the same). Names are validated (letters, digits, spaces and hyphens become a safe folder slug; no traversal; no clash with an existing status; length cap). Position: append at the end by default; if a clean insert between two statuses is possible without renaming existing folders, offer "after <status>", otherwise say in the doc that reordering is done by renaming folders.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] "Add status" on the board creates the column in VS Code and in `gitask serve`; it appears without reload; it is committed by pathspec only (the new folder placeholder), only when the project is a git repo and autoCommit is on
- [ ] Validation: empty, too long, duplicate (also case-insensitive), `..`, slashes, leading `_` (hidden folders) and non-ASCII are handled with a clear message in the dialog; the dialog stays open on error
- [ ] Optional colour is saved through the existing colour path
- [ ] Tests on a real temp git repo for the number choice (gaps, no gaps, many columns), validation, commit scope and clone survival; docs say how ordering works
- [ ] `gitask serve` and VS Code share the validation in core (one function)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
