# Ext-view-commands

- **ID:** T-0089
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · re-tiered from T1 on 2026-11-12: the diff adds a `HostMessage` variant in `packages/core/src/protocol.ts` and edits the shared UI shell (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-view-commands/` · **Branch:** `feat/view-commands`
- **Started / updated:** 2026-11-12 / 2026-11-12
- **Docs:** promoted from `Tasks/1-backlog/Ext-more-ideas.md`
- **Depends on:** none
- **Touches:** `packages/vscode/package.json` (`contributes.commands`, `contributes.keybindings`), `packages/vscode/src/extension.ts` (command registration, open-on-view), vscode tests, `packages/vscode/README.md`, `packages/vscode/src/view-commands.ts` (new). Widened (2026-11-12): `packages/core/src/protocol.ts` (+1 `HostMessage` variant `showView`) and `packages/ui/src/shell/App.tsx` (+4 lines handling it): an open panel keeps its own saved `ui.view`, so switching tabs on it needs a host message; no other task touches these files. Overlap: `Ext-default-view` also edits how `extension.ts` picks the view on open; keep edits small and local.

## Goal
One command palette entry per view (Overview, Board, List, Timeline) that opens GITASK on that view, plus default keyboard shortcuts that don't clash with VS Code's built-ins.

## Gates (T1)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new)  - [~] G4 run it (build + VSIX only; real VS Code not run)
- [x] G5 code review  - [x] G7 docs sync  - [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog (on merge)
- Skipped G6: no auth, data or new input path; `showView` is host to webview only and the UI checks the id against `VIEWS`.

## Done when
- [x] `GITASK: Show Overview / Board / List / Timeline` appear in the palette and open (or focus) the panel on that view (titled "Show", not "Open": `GITASK: Open Board` already exists and opens the remembered view)
- [x] Opening via a command also updates the remembered view
- [x] Keybindings chosen that don't override common VS Code shortcuts, listed in the README (chord `Ctrl+Alt+G` / macOS `Cmd+Alt+G`, then `O` `B` `L` `T`)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Gate results (2026-11-12, commit e0ac1be on `feat/view-commands`)
- G1: `git diff --stat main`: 7 files, +123/-5; Touches plus the widening noted above.
- G2: `pnpm typecheck` clean (core, cli, vscode, ui); `pnpm build` OK.
- G3: `pnpm test`: 494 pass, 0 fail; new `packages/vscode/test/view-commands.test.ts` checks package.json commands/keybindings against `VIEW_COMMANDS`.
- G4 (quick): built bundles contain the commands and the `showView` handler; `pnpm package` produced a valid VSIX. Not done: clicking the commands in a real VS Code window (tab switch on an open, a hidden and a closed panel). Check by hand in testing.
- G5 (lead session, read cold): pending view is cleared on dispose and sent after `ready`; UI ignores unknown ids; `openBoard` keeps its old behaviour without a view. No findings. Expect a one-line conflict with `Ext-default-view` on the `initialView` line.
- G7: README lists the commands and a shortcut table; `Docs/architecture/ui.md` documents the commands and `showView` (commit `b7d9374`).
