# Ops-web-seo

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · metadata and static assets, no logic
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-seo/` · **Branch:** `feat/web-seo`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Tasks/_plans/Ops-landing-page.md`; run the `seo-checklist` skill
- **Depends on:** Ops-web-scaffold
- **Touches:** `packages/web/docusaurus.config.ts` (metadata keys only), `packages/web/static/**` (robots, OG image, favicons, manifest), page front matter

## Goal
Make the site findable and shareable: unique titles and descriptions, canonical URLs, Open Graph and Twitter cards with a real image, sitemap, robots, `SoftwareApplication` JSON-LD, fast and accessible pages.

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 existing tests  - [ ] G4 run it (Lighthouse on the built site)
- [ ] G7 docs sync  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] The `seo-checklist` skill is run and its results pasted in the PR, with anything not applicable marked
- [ ] Lighthouse on `/` and one docs page: SEO 100, Accessibility 95 or more, Performance 90 or more (numbers from a real run)
- [ ] OG image is 1200x630 and shows the real product, not a placeholder
- [ ] JSON-LD validates in Google's Rich Results test or the schema.org validator (or noted as not run)
- [ ] `robots.txt` allows crawling and names the sitemap; no `noindex` on public pages
- [ ] Production URL comes from one config value, not scattered strings (final value set in `Ops-web-deploy`)
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
