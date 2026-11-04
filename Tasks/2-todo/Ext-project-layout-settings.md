# Ext-project-layout-settings

- **ID:** T-0073
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new host message that writes a config file (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-project-layout-settings/` · **Branch:** `feat/project-layout-settings`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Ext-project-header
- **Touches:** `packages/ui/src/components/` (new `project-dialog.tsx`), `packages/ui/src/shell/project-header.tsx` (edit button), `packages/core/src/protocol.ts` (`setProject` message), `packages/vscode/src/extension.ts` and `packages/cli/src/handler.ts` (handle it), tests

## Goal
Let users set the title, subtitle, logo and layout from the board instead of editing JSON: a "Customize header" dialog with live preview, a file picker for the logo (copied into `Tasks/` so it is committed with the project), and alignment, size and layout controls. Saves through `setProject`. `gitask serve` keeps its confirm/validation rules (`validateMessage`).

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Dialog edits title, subtitle, alignment, size, logo position and hides the title; preview matches the real header
- [ ] Logo upload accepts only the allowed image types and size, lands in `Tasks/`, and is the only file besides `gitask.json` that gets committed
- [ ] `validateMessage` rejects a bad `setProject` in both hosts; tests cover valid, invalid and hostile input
- [ ] Works in VS Code and in the browser host; Reset restores defaults
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
