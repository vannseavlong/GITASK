# Ext-view-shell

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · refactors the shared webview (`html.ts`) used by every view
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-view-shell/` · **Branch:** `feat/view-shell`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Core-task-model
- **Touches:** `packages/vscode/src/{extension,html}.ts`, `packages/vscode/src/views/{registry,board}.ts` (new), `packages/vscode/package.json`

## Goal
Split the one-page board into a view shell: a tab bar (Board, List, Timeline, Overview), a view registry that each view registers into, a typed message protocol between webview and extension, a strict Content-Security-Policy, and the last-used view remembered. The Board becomes the first registered view with sub-task progress on cards.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (F5 in a real VS Code window; this also closes the open G4 on `Ext-webview-board`)
- [ ] G5 code review  - [ ] G6 security (CSP, message validation)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] Switching views keeps scroll position and filters per view
- [ ] Messages from the webview are validated before they touch the filesystem or git
- [ ] CSP uses a nonce and no inline script outside it
- [ ] Adding a view means one new file under `src/views/` and one registry line
- [ ] Board behaves exactly as before: drag, new task, open file, watcher
- [ ] Light, dark and high-contrast themes checked
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
