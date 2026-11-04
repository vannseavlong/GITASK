# Core-report-header

- **ID:** T-0074
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · changes the report renderers (HTML and Markdown) that people share; embeds a user image (security gate) (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-report-header/` · **Branch:** `feat/report-header`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** Core-project-config
- **Touches:** `packages/core/src/report-render.ts`, `packages/core/test/`, `packages/ui/src/components/export-dialog.tsx` (a toggle only)

## Goal
Reports use the same project identity: the HTML report shows the title and logo (inlined as a data URI so the file stays standalone) and the Markdown report starts with the title. This is the "logo/company header" idea from `Ext-ui-later`, promoted. Off when no `project` is set.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new logic has tests)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] HTML report header follows `project.layout`; the logo is embedded, never linked; all text is escaped like the other fields
- [ ] Markdown report starts with the project title; CSV is unchanged
- [ ] Export dialog has "Include project header" (default on when a project is set)
- [ ] Existing report tests still pass; new tests cover with and without a project
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
