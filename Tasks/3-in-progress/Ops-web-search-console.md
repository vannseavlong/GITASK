# Ops-web-search-console

- **ID:** T-0065
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · metadata and sitemap config in one file, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-search-console/` · **Branch:** `feat/web-search-console`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/6-deploy/Ops-web-deploy.md` (Live check), `.claude/skills/seo-checklist`
- **Depends on:** none (site is live)
- **Touches:** `packages/web/docusaurus.config.ts` (metadata and sitemap keys only)

## Goal
Prepare the site for Google Search Console: add the owner-supplied `google-site-verification` meta tag and keep the `/search` page out of the sitemap.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static (typecheck, build pass)  - [x] G3 tests (Skipped G3: config only)  - [x] G4 run it (built output checked: tag on / and /docs/faq, sitemap has 12 URLs and no /search; not viewed on the live site)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] `google-site-verification` meta tag is in the built home page and docs pages
- [x] `/search` is not in `sitemap.xml`
- [ ] Owner deploys (`pnpm deploy:web`), clicks Verify in Search Console, submits `sitemap.xml` and requests indexing for `/`
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
