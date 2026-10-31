# Ext-brand-icon

- **ID:** T-0049
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · assets and one route; no logic beyond a static file (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-brand-icon/` · **Branch:** `feat/brand-icon`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** media/*, packages/vscode/src/extension.ts (iconPath), packages/cli/src/serve.ts (favicon route), packages/ui/index.html, packages/vscode/src/html.ts (link rel=icon)

## Goal
Colourful tab icon in VS Code (like the Marketplace icon, not a monochrome glyph), a favicon for `gitask serve` (the browser tab shows a globe today), and a better-quality icon set.

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (existing pass)  - [ ] G4 run it (quick)
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Tab icon in VS Code is the colourful icon (same family as `media/icon.png`), crisp at 16 px, one file for light and dark that reads on both
- [ ] Browser tab shows the icon: `<link rel=icon>` in the UI page, served by `gitask serve` from the fixed asset map (`/favicon.svg` + png fallback), and by the VS Code page where it applies
- [ ] Improved master icon: designed in Figma with the Figma MCP if it is available (file created, screenshot looked at), exported to SVG and a 256x256 PNG; `package.json` `icon` stays a PNG >= 128 px; if Figma is unavailable, hand-made SVG rendered and checked at 16, 32, 128 and 256 px
- [ ] Marketplace `.vsix` still contains the icons (`vsce ls`)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
