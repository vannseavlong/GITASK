# Ext-view-order

- **ID:** T-0070
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · shared UI state and tab registry, view ids list in the extension (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-view-order/` · **Branch:** `feat/view-order`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/ui/src/views/registry.tsx`, `packages/ui/src/shell/App.tsx`, `packages/ui/src/host/types.ts` (`UiState.viewOrder`), `packages/vscode/src/view-ids.ts`, `packages/vscode/test/` (registry-equals-ids test), `Docs/architecture/ui.md`

## Goal
Overview becomes the first tab, and the user can drag the tabs (Board, List, Timeline, Overview) into their own order. The order is remembered per user by the host (`saveState`). The tab ids stay validated by `VIEW_IDS`; the saved order is only a preference, so an unknown or missing id falls back to the default order.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Default order is Overview, Board, List, Timeline; the default opened view is the first tab for a user with no saved state
- [ ] Tabs reorder by drag with the same HTML5 drag the board uses (no new dependency) and by keyboard (e.g. Alt+Left/Right on a focused tab); a visible drop marker
- [ ] Order survives reload in VS Code and in `gitask serve`; a saved order with a removed or new view id still renders every view once
- [ ] A "Reset tab order" action; `Docs/architecture/ui.md` updated
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
