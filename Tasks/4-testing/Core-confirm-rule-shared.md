# Core-confirm-rule-shared

- **ID:** T-0080
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · shared security check used by two hosts (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude (agent)
- **Worktree:** `GITASK/GITASK-confirm-rule-shared/` · **Branch:** `refactor/confirm-rule-shared`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/5-done/Ext-project-layout-settings.md`, `Tasks/5-done/Ext-delete-dialog.md` (review findings)
- **Depends on:** none
- **Touches:** `packages/core/src/` (new shared check), `packages/vscode/src/delete-guard.ts`, `packages/vscode/src/extension.ts` (guard call only), `packages/cli/src/handler.ts` (confirm checks only), `packages/cli/test/ui-host.test.ts`, `packages/ui/src/lib/delete-flow.ts` and tests, `packages/ui/src/index.css` / `view-tabs.tsx` (contrast measurement only). Extras: `packages/vscode/test/delete-guard.test.ts` and `marker-contrast.test.ts` (tests), `Docs/architecture/serve.md` (one path), `CHANGELOG.md`

## Goal
Put the "a delete needs confirmed:true" rule in one place in core and use it from the VS Code extension and the serve handler, so the two hosts cannot drift. Remove the dead `confirmsDelete:false` branch and rename its test. Measure the contrast of the tab drop marker against the theme backgrounds and fix it if it is under 3:1.

## Gates
- [x] G1 scope  - [x] G2 static (typecheck, build)  - [x] G3 tests (419 pass)  - [x] G4 run it (node tests on real handler; no VS Code available)
- [x] G5 code review (self cold pass, not a separate agent)  - [x] G6 security (self review: guard still runs before the switch in both hosts)  - [x] G7 docs sync
- [x] G8 PR message  - [x] G11 changelog

Not run: a separate review agent for G5/G6; a real VS Code webview.

## Findings
- Two copies compared: same three messages, same conditions. Only difference: the handler tested `!m.confirmed` (truthy), the extension `m.confirmed !== true`. `validateMessage` already rejects anything but `true` or absent, so behaviour is identical; the shared rule uses the strict form. The handler now calls it once after validation and path guard (was inside each case; one reply shape, `err()`, unchanged).
- Dead branch: `requestDelete` with `confirmsDelete:false` removed (both hosts use the dialog). `Host.confirmsDelete` is still declared and set in the host files (outside Touches); it is now unused by the flow and can go in a follow-up.
- Drop marker is `bg-foreground`. WCAG ratios from the CSS fallbacks (test `packages/vscode/test/marker-contrast.test.ts`): light #1f2328 on #ffffff 15.80, sidebar 14.84, accent 13.55; dark #cccccc on #1e1e1e 10.38, sidebar 9.54, accent 8.64; high-contrast (no CSS fallback, VS Code built-in #fff/#000) 21.00. All above 3:1, so no colour change.

## Done when
- [x] One `unconfirmedDelete`-style function in core with the same messages; both hosts call it; the existing guard and handler tests still pass, plus a test that every delete message type in the protocol is covered by the rule
- [x] The extension still calls the guard before its message switch (source-shape test kept)
- [x] The dead host branch in `delete-flow.ts` is removed or justified; test title fixed
- [x] Drop-marker contrast measured in light, dark and high-contrast token values (script or test using the CSS fallback values); result written in the task; fixed if below 3:1
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
