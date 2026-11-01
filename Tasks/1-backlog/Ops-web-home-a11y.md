# Ops-web-home-a11y

- **ID:** T-0061
- **Repo:** GITASK
- **Owner:** Owner
- **Tier:** T1 · one component, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-<short-name>/` · **Branch:** `feat/<short-name>`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** <YYYY-MM-DD, optional>
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/CommandLine.tsx`, `packages/web/src/landing/landing.css` (command-line region only)

## Goal
Fix the Lighthouse `aria-required-children` failure on the home page (CLI table markup with `role="table"`/`role="row"`), taking Accessibility from 95 to 100. Found by the `Ops-web-seo` run.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Lighthouse mobile on `/`: Accessibility 100, no `aria-required-children` failure
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
