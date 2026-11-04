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
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (skipped: no auth/data/input; see note)  - [x] G7 docs sync
- [x] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [x] Default order is Overview, Board, List, Timeline; the default opened view is the first tab for a user with no saved state
- [x] Tabs reorder by drag with the same HTML5 drag the board uses (no new dependency) and by keyboard (e.g. Alt+Left/Right on a focused tab); a visible drop marker
- [ ] Order survives reload in VS Code and in `gitask serve`; a saved order with a removed or new view id still renders every view once
- [x] A "Reset tab order" action; `Docs/architecture/ui.md` updated
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Notes
- Built on `feat/view-order`. Extra files beyond Touches: `packages/ui/src/shell/view-tabs.tsx`, `packages/ui/src/lib/view-order.ts`, `packages/ui/src/main.tsx` (fallback uses `DEFAULT_VIEW`), `packages/vscode/test/view-order.test.ts`, and one expectation in `ui-html.test.ts` (default view is now overview). Order lives in `UiState.viewOrder`, which both hosts already persist whole, so no host code changed.
- Not yet done: G4 (drag, Alt+Arrow and reload not exercised in a real webview or browser), G5 (needs a separate review agent), reload persistence not checked by hand, changelog and cleanup happen at merge. Existing VS Code users keep their saved last view (`gitask.lastView`).
