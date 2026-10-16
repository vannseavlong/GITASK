# Ext-task-detail

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen, renders untrusted Markdown, writes via toggle
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-task-detail/` · **Branch:** `feat/task-detail`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/views/detail.ts`, `packages/vscode/src/markdown.ts`, board card click handler

## Goal
Open a task from a card or row into a detail panel: title, header fields, each section rendered as Markdown, sub-task checkboxes you can toggle, progress bar, and an Open file button. Replaces opening the raw `.md` as the default click.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (F5)
- [ ] G5 code review  - [ ] G6 security (strict: Markdown is untrusted, no raw HTML, links limited to http, https and workspace files)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] A task with HTML, script tags and `javascript:` links renders as inert text
- [ ] Toggling a checkbox updates the file, the card progress and the detail at once
- [ ] A toggle that fails (file changed, git error) shows a message and leaves the UI in the true state
- [ ] Tables, code blocks, lists and links render; images load only from the workspace
- [ ] "Open file" still opens the raw Markdown; a setting can restore click-opens-file
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
