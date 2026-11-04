# Ext-project-header

- **ID:** T-0072
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI region plus webview CSP change and a logo route (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-project-header/` · **Branch:** `feat/project-header`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Core-project-config, Ext-view-order (both touch the shell/App.tsx and UiState)
- **Touches:** `packages/ui/src/shell/` (new `project-header.tsx`, `App.tsx`), `packages/vscode/src/html.ts` (CSP `img-src`), `packages/vscode/src/extension.ts` (logo as a webview URI), `packages/cli/src/serve.ts` and `handler.ts` (logo route), `Docs/architecture/ui.md`

## Goal
Render the project title, subtitle and logo as a header above the tabs, shown on every view in both the VS Code board and `gitask serve`. It follows `project.layout` (alignment, size, logo position). Nothing is shown when no `project` is set, so existing boards look the same.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] Header shows title, subtitle and logo on Board, List, Timeline and Overview, in light, dark and high contrast
- [ ] Logo loads in VS Code through a webview URI and in the browser through a fixed route that serves only the configured logo file; CSP gains `img-src` for those sources only; SVG is shown through `<img>` so no script can run
- [ ] A missing or broken logo falls back to the title only, with no broken-image icon
- [ ] All layout options (align, size, logo position, hide title) render correctly at narrow webview width
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
