# Ext-view-shell

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · refactors the shared webview (`html.ts`) used by every view
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-view-shell/` · **Branch:** `feat/view-shell`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/requirements/views.md`, `Tasks/_plans/Ext-views.md`
- **Depends on:** Core-task-model
- **Touches:** `packages/vscode/src/{extension,html}.ts`, `packages/vscode/src/views/{registry,board}.ts` (new), `packages/vscode/package.json`

## Goal
Split the one-page board into a view shell: a tab bar (Board, List, Timeline, Overview), a view registry that each view registers into, a typed message protocol between webview and extension, a strict Content-Security-Policy, and the last-used view remembered. The Board becomes the first registered view with sub-task progress on cards.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [ ] G4 run it (PARTIAL: no F5 in a real VS Code window was possible from the agent; generated HTML is checked by tests, human must F5; this also closes the open G4 on `Ext-webview-board`)
- [x] G5 code review (fresh agent, 2026-10-17; findings fixed in ce65a89 and the follow-up)  - [x] G6 security (CSP nonce, message validation, textContent only; self-checked, no separate reviewer)  - [x] G7 docs sync (no user-facing doc changes needed)
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog (integrator adds)

## Done when
- [x] Switching views keeps scroll position and filters per view
- [x] Messages from the webview are validated before they touch the filesystem or git
- [x] CSP uses a nonce and no inline script outside it
- [x] Adding a view means one new file under `src/views/` and one registry line
- [ ] Board behaves exactly as before: drag, new task, open file, watcher
- [ ] Light, dark and high-contrast themes checked
- [ ] Works with an empty board, one column and 500 tasks
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Verified: `pnpm typecheck`, `pnpm test` (38 pass: 21 core + 17 vscode), `pnpm build`, `pnpm package`. Not verified: F5 in real VS Code (drag, new task, watcher, themes, 500 cards), so those Done-when items stay unticked. Switching/scroll/filter logic is untested at runtime (no DOM in tests); the generated script is only parse-checked.
- Pure, vscode-free modules: `src/protocol.ts` (validateMessage), `src/html.ts`, `src/views/registry.ts`; tests in `packages/vscode/test/`; root `pnpm test` runs them.
- Board filter box added (per-view filter state demo). Everything else on the board is as before.
- Extension points: add `src/views/<id>.ts` exporting a `ViewDef` (`{id,label,js,css}`), then replace the `placeholder("<id>", ...)` line in `src/views/registry.ts`. Client API in `src/html.ts`: `GITASK.register({id, mount(root, api), render(board, api)})`, `GITASK.el`, `api.post/board/state/save`. Messages: `src/protocol.ts` (add a case there plus a test, then handle it in `extension.ts`).
