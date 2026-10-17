# Ext-webview-board

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI, new extension
- **Claimed by:** none
- **Worktree:** n/a (solo bootstrap, built on main) · **Branch:** main
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** Tasks/_plans/Core-gitask-mvp.md
- **Depends on:** Core-move-create
- **Touches:** packages/vscode

## Goal
Kanban webview with drag-and-drop, open file, new task, file watcher, settings.

## Done when
- [x] Tests for new logic pass
- [ ] Root CHANGELOG.md entry added

## Gate notes
- G2 typecheck and G3 core tests pass; extension builds and packages to a .vsix.
- G4 NOT done: the webview has not been run in a real VS Code window (F5). Do this before moving to 5-done.
