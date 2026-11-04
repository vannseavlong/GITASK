# Core-report-header

- **ID:** T-0074
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · changes the report renderers (HTML and Markdown) that people share; embeds a user image (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** agent (Claude)
- **Worktree:** `GITASK/GITASK-report-header/` · **Branch:** `feat/report-header`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Core-project-config
- **Touches:** `packages/core/src/report-render.ts`, `packages/core/test/`, `packages/ui/src/components/export-dialog.tsx` (a toggle only)

## Goal
Reports use the same project identity: the HTML report shows the title and logo (inlined as a data URI so the file stays standalone) and the Markdown report starts with the title. This is the "logo/company header" idea from `Ext-ui-later`, promoted. Off when no `project` is set.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope (also touched `core/src/index.ts`, `core/src/protocol.ts`, `vscode/src/report-request.ts`, `cli/src/commands.ts`, `vscode/test/export.test.ts`, `Docs/architecture/config.md`: needed to carry the toggle and header; no UI shell or html)  - [x] G2 static (`pnpm typecheck`)  - [x] G3 tests (`pnpm test` 388 pass, `pnpm build` ok)  - [ ] G4 run it (not run in a real webview; see note)
- [ ] G5 code review (cold self-review by the author only; a separate agent is still needed)  - [ ] G6 security (hardening done: resolveLogo + O_NOFOLLOW + fstat, escaped text, img-only data URI; skill not run)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [x] G11 changelog

## Done when
- [x] HTML report header follows `project.layout`; the logo is embedded, never linked; all text is escaped like the other fields
- [x] Markdown report starts with the project title; CSV is unchanged
- [x] Export dialog has "Include project header" (default on when a project is set)
- [x] Existing report tests still pass; new tests cover with and without a project
- [x] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
