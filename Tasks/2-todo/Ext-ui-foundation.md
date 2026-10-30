# Ext-ui-foundation

- **ID:** T-0037
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new workspace package, new build, changes the webview CSP, edits shared shell (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-ui-foundation/` · **Branch:** `feat/ui-foundation`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/ui/** (new), packages/vscode/src/html.ts, extension.ts, protocol.ts (no change to messages), root package.json scripts, esbuild/vite config

## Goal
Create `packages/ui` (React + TypeScript + Vite + Tailwind + shadcn/Radix) with one `Host` transport interface, a VS Code theme mapping, the shell (tabs, filter bar) and the Board view, and load it in the VS Code webview instead of the string-built shell.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `Host` interface (`getBoard`, `send(message)`, `onBoard`) with a `VsCodeHost` (postMessage, existing protocol) and a stub `HttpHost` used by CLI-serve
- [ ] shadcn components added as source: Button, Dialog, Popover, Command (combobox), Calendar + range DatePicker, Tabs, Badge, Avatar, Select, Tooltip
- [ ] Date range filter uses the shadcn range picker (image 3 replaced); same `filter-logic` rules and tests as today
- [ ] Board view parity: drag to move, delete, colours, status show/hide, ID, filter
- [ ] Webview CSP: `script-src` nonce + `cspSource`, `style-src ${cspSource}` and `style-src-attr 'unsafe-inline'` only (Radix positions with style attributes); documented in `Docs/architecture/ui.md`
- [ ] Theme follows VS Code (CSS variables mapped to shadcn tokens) in light, dark and high-contrast
- [ ] `pnpm build` bundles `packages/ui` into the extension; `.vsix` size noted in the PR; every webview message still goes through `validateMessage`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
