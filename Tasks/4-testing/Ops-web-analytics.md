# Ops-web-analytics

- **ID:** T-0097
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · tracking (new events), new feature on the website, edits shared landing component (`Shared.tsx`)
- **Claimed by:** Claude (PR open)
- **Worktree:** `GITASK/GITASK-web-analytics/` · **Branch:** `feat/web-analytics`
- **Started / updated:** 2026-11-13 / 2026-11-13
- **Docs:** `Docs/architecture/analytics.md`
- **Depends on:** the owner's GA4 measurement ID (Firebase project `longcelot-eco-system`, web app `gitask-web`)
- **Touches:** `packages/web/docusaurus.config.ts`, `packages/web/src/analytics/`, `packages/web/src/landing/components/Shared.tsx`, `packages/web/test/analytics.test.ts`, `Docs/architecture/analytics.md`, `Docs/README.md`

## Goal
Count visits and key actions on gitask-me.web.app in Firebase Analytics (GA4), without personal data and without tracking local, preview or fork builds.

## Gates
- [x] G1 scope: only the `Touches` paths plus `Docs/architecture/release.md` (one link line)
- [x] G2 static: `pnpm typecheck`, `pnpm --filter gitask-web run typecheck`, `pnpm --filter gitask-web run build`
- [x] G3 tests: 17 new in `packages/web/test/analytics.test.ts`; `pnpm test` 518/518
- [x] G4 run it: headless Chrome on a production build: localhost sends nothing; on the real host (mapped locally, gtag.js stubbed) every event fires with cleaned values
- [x] G5 code review (fresh agent): no blockers; fixed page context after route change, aria-label text, link_url cap, duplicate search, docs (custom dimensions)
- [x] G6 security (fresh agent): no blockers; fixed search query in the /search title, referrer and enhanced-measurement leaks (docs), token redaction; CSP and consent noted as follow-ups
- [x] G7 docs sync: `Docs/architecture/analytics.md`, index, `release.md` link
- [x] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog (on merge, by `changelog.yml`)

## Done when
- [ ] Production build on the real host loads gtag and sends `page_view`; localhost, preview channel and forks send nothing
- [ ] Events fire: `page_view` on route change (not on `#hash` jumps), `cta_click`, `outbound_click`, `download_vsix`, `copy_command`, `copy_code`, `search`
- [ ] No personal data: text is trimmed, emails and long numbers redacted, URLs lose query and hash; Google signals and ad personalisation off
- [x] Measurement ID `G-XWPLC3S02X` set in `docusaurus.config.ts`
- [ ] Owner applies the GA4 settings in `Docs/architecture/analytics.md` (enhanced measurement, custom dimensions, retention)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
