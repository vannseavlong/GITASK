# Ext-task-detail

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new screen, renders untrusted Markdown, writes via toggle
- **Claimed by:** task-detail agent (Claude), 2026-10-17 (work done, released)
- **Worktree:** `GITASK/GITASK-task-detail/` · **Branch:** `feat/task-detail`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Ext-view-shell
- **Touches:** `packages/vscode/src/{detail,markdown,taskfile,html,protocol,extension}.ts`, `views/board.ts`, tests (detail is a shell overlay, not a view file)

## Goal
Open a task from a card or row into a detail panel: title, header fields, each section rendered as Markdown, sub-task checkboxes you can toggle, progress bar, and an Open file button. Replaces opening the raw `.md` as the default click.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it (F5: not possible from the agent, human must F5)
- [ ] G5 code review  - [~] G6 security (self-checked with hostile-input tests; needs a separate reviewer) (strict: Markdown is untrusted, no raw HTML, links limited to http, https and workspace files)  - [x] G7 docs sync (no user docs changed)
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] A task with HTML, script tags and `javascript:` links renders as inert text (unit-tested on the shipped renderer with a fake DOM)
- [ ] Toggling a checkbox updates the file, the card progress and the detail at once
- [ ] A toggle that fails (file changed, git error) shows a message and leaves the UI in the true state
- [x] Tables, code blocks, lists and links render (unit-tested on the shipped renderer with a fake DOM); images load only from the workspace
- [ ] "Open file" still opens the raw Markdown; a setting can restore click-opens-file
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Verified: `pnpm typecheck`, `pnpm test` (48 pass), `pnpm build`, `pnpm package`. NOT verified: F5 in real VS Code (overlay layout, focus, themes, drag vs click on cards, 500 tasks). The detail JS (`detail.ts`) is only parse-checked; the Markdown parser/renderer is run in node against a fake DOM.
- `GITASK.openDetail(absoluteTaskPath)` is global; Board cards call it (click, Enter, Space). Falls back to the `open` message if absent.
- New messages: `readTask {path}` -> host `taskBody {path, text|error}` (validated like `open`; `src/taskfile.ts` refuses symlinks, non-files, >512 KB).
- Checkbox mapping: renderer emits `(line, ordinal-in-line)`; detail maps to `task.subtasks` by line, so several checkboxes on one line (gate rows) toggle correctly. Checkboxes in numbered/`+` items or outside list items render disabled/as text, matching core.
- Toggle: checkbox snaps back to the board's truth and posts `toggleSubtask`; each board message refreshes the panel and re-requests the body, so a failed toggle shows the host error and the true state.
- Images are not rendered (`![]()` shows as text plus a plain link). Not done: the setting to restore click-opens-file; empty/500-task checks.
