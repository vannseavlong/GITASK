# Ext-verify-in-vscode

- **ID:** T-0005
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · manual check
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-verify-in-vscode/` · **Branch:** `fix/verify-in-vscode`
- **Started / updated:** 2026-11-03 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Docs/architecture/ui.md`
- **Depends on:** Ext-project-layout-settings, Ext-view-tabs-polish (everything in the UX wave must be merged)
- **Touches:** `packages/vscode/**` (fixes found only)

## Goal
Run the extension (F5 on packages/vscode) and `gitask serve` on a workspace with Tasks/, and walk through everything shipped in the UX wave. Nothing in it has been seen in a real VS Code webview or browser yet; only unit tests and headless screenshots back it. Fix bugs found, then move Ext-webview-board to 5-done.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [x] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Drag moves a file and commits (check git log); autocommit off and a non-git folder behave
- [x] New task from the board and from `GITASK: New Task` (board closed): board stays, new card appears, detail panel opens, no raw `.md`; duplicate id shows an error; "Open file" works
- [x] Delete a task, an empty status and a sub-task: in-app dialog (Esc cancels, focus returns, light/dark/high contrast); a bare delete message is refused
- [x] Tabs open Overview first; drag a tab and Alt+Arrow reorder it without switching view; order survives reload in VS Code and in `gitask serve`; Reset works; Firefox path works in `serve`
- [x] Project header: set title, subtitle, logo and every layout option from "Customize header"; shows on all four views; bad or missing logo falls back to text; no header when no project
- [x] Export: HTML and Markdown reports carry the header (preview and file), toggle works
- [x] Landing page (built site): Marketplace links in hero, navbar and install section, light and dark, mobile width; Lighthouse accessibility on `/`
- [x] Ext-webview-board moved to 5-done

## How to run it
Build, install and the full checklist: `Docs/architecture/manual-testing.md`. Walk through it, then tick "Done when" above.

## Result
Run by the owner on the 0.6.0 test build (VS Code, `gitask serve` and the website), following `Docs/architecture/manual-testing.md`. Bugs found were fixed before the release (heatmap fit, split button, Add status, logo upload, header menu, hide title). Not covered by hand: Firefox drag in `gitask serve`, a screen reader, touch input.
