# Ops-web-analytics

- **ID:** T-0097
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · tracking (new events), new feature on the website, edits shared landing component (`Shared.tsx`)
- **Claimed by:** Claude
- **Worktree:** `GITASK/GITASK-web-analytics/` · **Branch:** `feat/web-analytics`
- **Started / updated:** 2026-11-13 / 2026-11-13
- **Docs:** `Docs/architecture/analytics.md`
- **Depends on:** the owner's GA4 measurement ID (Firebase project `longcelot-eco-system`, web app `gitask-web`)
- **Touches:** `packages/web/docusaurus.config.ts`, `packages/web/src/analytics/`, `packages/web/src/landing/components/Shared.tsx`, `packages/web/test/analytics.test.ts`, `Docs/architecture/analytics.md`, `Docs/README.md`

## Goal
Count visits and key actions on gitask-me.web.app in Firebase Analytics (GA4), without personal data and without tracking local, preview or fork builds.

## Gates
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review (fresh agent)  - [ ] G6 security (fresh agent: third-party script, data sent off-site)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog (on merge, by `changelog.yml`)

## Done when
- [ ] Production build on the real host loads gtag and sends `page_view`; localhost, preview channel and forks send nothing
- [ ] Events fire: `page_view` on route change (not on `#hash` jumps), `cta_click`, `outbound_click`, `download_vsix`, `copy_command`, `copy_code`, `search`
- [ ] No personal data: text is trimmed, emails and long numbers redacted, URLs lose query and hash; Google signals and ad personalisation off
- [ ] Owner adds the measurement ID and turns off "Page changes based on browser history events" in the GA4 web stream
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
