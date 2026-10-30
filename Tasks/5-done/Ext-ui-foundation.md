# Ext-ui-foundation

- **ID:** T-0037
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new workspace package, new build, changes the webview CSP, edits shared shell (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-foundation/` · **Branch:** `feat/ui-foundation`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/ui/** (new), packages/vscode/src/html.ts, extension.ts, protocol.ts (no change to messages), root package.json scripts, esbuild/vite config

## Goal
Create `packages/ui` (React + TypeScript + Vite + Tailwind + shadcn/Radix) with one `Host` transport interface, a VS Code theme mapping, the shell (tabs, filter bar) and the Board view, and load it in the VS Code webview instead of the string-built shell.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (Chrome fixture only; real VS Code not run)
- [x] G5 code review  - [x] G6 security (only if input or auth handling changes)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [ ] `Host` interface (`getBoard`, `send(message)`, `onBoard`) with a `VsCodeHost` (postMessage, existing protocol) and a stub `HttpHost` used by CLI-serve
- [ ] shadcn components added as source: Button, Dialog, Popover, Command (combobox), Calendar + range DatePicker, Tabs, Badge, Avatar, Select, Tooltip
- [ ] Date range filter uses the shadcn range picker (image 3 replaced); same `filter-logic` rules and tests as today
- [ ] Board view parity: drag to move, delete, colours, status show/hide, ID, filter
- [ ] Webview CSP: `script-src` nonce + `cspSource`, `style-src ${cspSource}` and `style-src-attr 'unsafe-inline'` only (Radix positions with style attributes); documented in `Docs/architecture/ui.md`
- [ ] Theme follows VS Code (CSS variables mapped to shadcn tokens) in light, dark and high-contrast
- [ ] `pnpm build` bundles `packages/ui` into the extension; `.vsix` size noted in the PR; every webview message still goes through `validateMessage`
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Delivery notes (2026-10-30)
- Built on its own branch, merged into `release/0.5.0` with the rest of 0.5.0 (no tag, nothing published).
- Gates run on the merged release: G2 typecheck clean, G3 273 tests pass (new tests for this task included), build clean, `pnpm package` ok (see `Ops-release-0-5`).
- G5: independent code review of the whole release; its findings were fixed on `fix/review-fixes` (test first). G6: independent security review; findings fixed on `fix/security-fixes`. The UI components `board`, `list`, `timeline`, `overview`, `export-dialog`, `subtasks`, `assignee-picker`, `people-filter` were not reached by the reviewers.
- G7: docs in `Docs/architecture/` and `Docs/requirements/views.md`, website pages in `packages/web/docs`.
- G4: seen in Chrome with a fixture board only. NOT yet run in a real VS Code window (F5).
