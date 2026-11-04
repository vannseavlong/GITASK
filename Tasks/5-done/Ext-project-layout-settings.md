# Ext-project-layout-settings

- **ID:** T-0073
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new host message that writes a config file (auto picker, see `PIPELINE.md`)
- **Claimed by:** agent-aa02abef (Claude)
- **Worktree:** `GITASK/GITASK-project-layout-settings/` · **Branch:** `feat/project-layout-settings`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Ext-project-header
- **Extra files touched:** `packages/core/src/project-rules.ts` and `project-save.ts` (new, pure rules and save), `packages/core/src/config.ts` (moved constants, `withFile` commit option), `packages/core/src/index.ts`, `packages/cli/src/serve.ts` (upload body cap), `packages/ui/src/host/http-host.ts` (upload header) and `mock-host.ts`, `packages/ui/src/lib/logo-file.ts`, `Docs/architecture/config.md`, `ui.md`, `CHANGELOG.md`
- **Touches:** `packages/ui/src/components/` (new `project-dialog.tsx`), `packages/ui/src/shell/project-header.tsx` (edit button), `packages/core/src/protocol.ts` (`setProject` message), `packages/vscode/src/extension.ts` and `packages/cli/src/handler.ts` (handle it), tests

## Goal
Let users set the title, subtitle, logo and layout from the board instead of editing JSON: a "Customize header" dialog with live preview, a file picker for the logo (copied into `Tasks/` so it is committed with the project), and alignment, size and layout controls. Saves through `setProject`. `gitask serve` keeps its confirm/validation rules (`validateMessage`).

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (new logic has tests)  - [x] G4 run it (mock build in headless Chromium: dialog preview only; no save round trip in a browser)
- [x] G5 code review (cold self-review by the author, no separate agent)  - [x] G6 security (self-review of the upload path; no security-review skill run)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [x] Dialog edits title, subtitle, alignment, size, logo position and hides the title; preview matches the real header
- [x] Logo upload accepts only the allowed image types and size, lands in `Tasks/`, and is the only file besides `gitask.json` that gets committed
- [x] `validateMessage` rejects a bad `setProject` in both hosts; tests cover valid, invalid and hostile input
- [ ] Works in VS Code and in the browser host; Reset restores defaults (covered by tests and the mock; not tried in a real VS Code webview)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
