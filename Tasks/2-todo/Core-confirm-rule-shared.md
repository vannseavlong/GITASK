# Core-confirm-rule-shared

- **ID:** T-0080
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · shared security check used by two hosts (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-confirm-rule-shared/` · **Branch:** `refactor/confirm-rule-shared`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-project-layout-settings.md`, `Tasks/5-done/Ext-delete-dialog.md` (review findings)
- **Depends on:** none
- **Touches:** `packages/core/src/` (new shared check), `packages/vscode/src/delete-guard.ts`, `packages/vscode/src/extension.ts` (guard call only), `packages/cli/src/handler.ts` (confirm checks only), `packages/cli/test/ui-host.test.ts`, `packages/ui/src/lib/delete-flow.ts` and tests, `packages/ui/src/index.css` / `view-tabs.tsx` (contrast measurement only)

## Goal
Put the "a delete needs confirmed:true" rule in one place in core and use it from the VS Code extension and the serve handler, so the two hosts cannot drift. Remove the dead `confirmsDelete:false` branch and rename its test. Measure the contrast of the tab drop marker against the theme backgrounds and fix it if it is under 3:1.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] One `unconfirmedDelete`-style function in core with the same messages; both hosts call it; the existing guard and handler tests still pass, plus a test that every delete message type in the protocol is covered by the rule
- [ ] The extension still calls the guard before its message switch (source-shape test kept)
- [ ] The dead host branch in `delete-flow.ts` is removed or justified; test title fixed
- [ ] Drop-marker contrast measured in light, dark and high-contrast token values (script or test using the CSS fallback values); result written in the task; fixed if below 3:1
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
