# Ext-project-header

- **ID:** T-0072
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new UI region plus webview CSP change and a logo route (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none (released on move to testing; was an agent session, 2026-11-05)
- **Worktree:** `GITASK/GITASK-project-header/` · **Branch:** `feat/project-header`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Core-project-config, Ext-view-order (both touch the shell/App.tsx and UiState)
- **Touches:** `packages/ui/src/shell/` (new `project-header.tsx`, `App.tsx`), `packages/vscode/src/html.ts` (CSP `img-src`), `packages/vscode/src/extension.ts` (logo as a webview URI), `packages/cli/src/serve.ts` and `handler.ts` (logo route), `Docs/architecture/ui.md`. Also touched, needed for the one logo helper and its message: `packages/core/src/config.ts`, `index.ts`, `protocol.ts` (`readLogoBytes`, `logoDataUrl`, `readLogo`/`logo` messages), `Docs/architecture/serve.md` and `config.md` (one line each), plus UI host files and tests.

## Goal
Render the project title, subtitle and logo as a header above the tabs, shown on every view in both the VS Code board and `gitask serve`. It follows `project.layout` (alignment, size, logo position). Nothing is shown when no `project` is set, so existing boards look the same.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope (extra files listed under Touches)  - [x] G2 static (`pnpm typecheck`, `pnpm build`)  - [x] G3 tests (`pnpm test`: 388 pass; new tests for `readLogoBytes`, `readLogo` message, `/api/logo`, CSP, header logic)  - [x] G4 run it (mock build in headless Chromium at 420 px wide, four layouts; not run in real VS Code or `gitask serve`)
- [ ] G5 code review (only a self-review of the diff so far; needs a separate agent)  - [ ] G6 security (own review notes below; skill not run)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [x] Header shows title, subtitle and logo above the tabs (so on every view); looked at in light only, dark and high contrast not looked at (theme tokens only)
- [x] Logo loads in VS Code as a `data:` URL answered to a `readLogo` message (not a webview URI: that would need the Tasks folder as a resource root and could not re-check at serve time) and in the browser through `GET /api/logo`; CSP gains `img-src ${cspSource} data:`; SVG is shown through `<img>` only
- [x] Every host serves the logo through one core helper that re-runs `resolveLogo` (regular file, cap, inside `Tasks/`) at serve time, so a file swapped after the board loaded is not followed (Core-project-config review, TOCTOU)
- [x] A missing or broken logo falls back to the title only, with no broken-image icon
- [x] All layout options render at 420 px wide in the mock (four combinations looked at; all 36 combinations covered by class-mapping tests)
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

## Security notes (self-review, not the G6 skill)
- Logo bytes only from `readLogoBytes(dir)`: no path argument, config re-read, `resolveLogo` re-run, `O_NOFOLLOW` open, size re-checked after fstat and read. Symlink swap and growth past the cap are tested.
- `/api/logo` needs the token (query allowed, like SSE), ignores any other query, sends a fixed allow-listed type, `nosniff`, `sandbox` CSP.
- Title and subtitle are React text; the logo is an `<img>` only.
- Risk left: the token is in the logo URL in the browser (same as the SSE URL; `Referrer-Policy: no-referrer`). Between `resolveLogo` and `open` a parent folder could still be swapped for a symlink; `O_NOFOLLOW` covers only the last segment.
