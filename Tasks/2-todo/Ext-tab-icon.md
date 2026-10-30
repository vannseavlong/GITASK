# Ext-tab-icon

- **ID:** T-0036
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · one-line UI change, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-tab-icon/` · **Branch:** `feat/tab-icon`
- **Started / updated:** none / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-people-export-ui.md`
- **Depends on:** none
- **Touches:** packages/vscode/src/extension.ts (`createWebviewPanel` block), packages/vscode/media/

## Goal
Show the GITASK icon on the editor tab (image 2 shows the generic file icon).

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (existing pass)  - [ ] G4 run it (quick)
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] `panel.iconPath` set from `media/` (light and dark variants; add a square SVG or PNG that reads at 16 px)
- [ ] Icon appears on the tab when the board opens, in light and dark themes
- [ ] `.vscodeignore` / `files` still ship the icon in the `.vsix`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
