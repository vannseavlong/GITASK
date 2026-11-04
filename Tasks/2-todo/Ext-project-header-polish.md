# Ext-project-header-polish

- **ID:** T-0083
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · removes a field from the shared config, protocol and report renderer; new upload UI (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-project-header-polish/` · **Branch:** `fix/project-header-polish`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Docs/architecture/manual-testing.md` (found while running it)
- **Depends on:** none
- **Touches:** `packages/ui/src/components/project-dialog.tsx`, `packages/ui/src/shell/project-header.tsx`, `packages/ui/src/lib/project-header.ts` and `project-diff.ts`, `packages/ui/src/lib/logo-file.ts`, `packages/core/src/project-rules.ts`, `config.ts`, `types.ts`, `packages/core/src/report-render.ts`, `packages/core/src/protocol.ts` (project fields only), tests, `Docs/architecture/config.md` and `ui.md`

## Goal
Three fixes to the project header from the first manual run. (1) The logo upload section looks bad (a native "Choose File / No file chosen" input) and so does the state after upload. Replace it with a proper drop zone: dashed area with an icon, "Drop an image or browse", accepted types and size; after choosing, show a thumbnail on a checkerboard, the file name and size, and "Replace" and "Remove" actions; show the error state inside the same area; keyboard and screen reader friendly. (2) Remove the "Hide the title (keep subtitle and logo)" option everywhere (dialog, header, report, `showTitle` in config rules, protocol, docs, tests): it makes no sense. An old `showTitle` key in a gitask.json must be ignored on read and dropped on the next save, not break anything. (3) The always-visible "Customize header" / "Add project header" button on the header is clumsy: replace it with a compact vertical-dots (kebab) action menu in the header corner, consistent with the other kebab menus, with "Customize header" in it; when no project is set show a quiet ghost action instead ("Add project header"), which does not take a full row. Layout stays correct for every alignment and logo position.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] The upload area has idle, drag-over, selected (thumbnail, name, size, Replace, Remove), and error states; dropping or browsing both work; a file that fails the client-side check shows the reason inside the area
- [ ] `showTitle` is gone from the dialog, header, report, rules, protocol and docs; an existing gitask.json that has it still loads and the key disappears on the next save; tests for both
- [ ] The header action is a kebab menu (or quiet ghost action when no project), works with keyboard and screen reader, does not shift the layout, and looks right at narrow width
- [ ] Looked at the mock build in headless Chromium for each state, light and dark
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
