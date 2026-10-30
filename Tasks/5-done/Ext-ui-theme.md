# Ext-ui-theme

- **ID:** T-0055
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI feature with stored user input applied to CSS (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-ui-theme/` · **Branch:** `feat/ui-theme`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/ui/src/theme/** (new), shell header, index.css (additive tokens), packages/cli serve page title bar

## Goal
In the browser (`gitask serve`) add a Dark/Light toggle (with System) and let users set their own colour tokens.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Toggle button in the header cycles System / Light / Dark, remembered in localStorage, applied before first paint (no flash); in VS Code the theme still follows VS Code and the toggle is hidden
- [ ] A Theme popover: presets (e.g. Neutral, Blue, Green, Violet, Red) and custom hex for primary, accent/background/card/border, radius slider; live preview; Reset; Export/Import as JSON
- [ ] Every custom value is validated (`#rrggbb` only) and applied through `document.documentElement.style.setProperty`, never as injected CSS text; contrast check warns when text on primary is below 4.5:1
- [ ] Charts and the calendar use the tokens so they follow the theme
- [ ] Tests for token validation, contrast function and persistence; looks right in Chrome in both modes
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
