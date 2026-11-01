# Ops-web-seo

- **ID:** T-0009
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · metadata and static assets, no logic
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-seo/` · **Branch:** `feat/web-seo`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-07
- **Docs:** `Tasks/_plans/Ops-landing-page.md`, `Tasks/_plans/Ops-web-polish-and-readme.md`; run the `seo-checklist` skill
- **Depends on:** Ops-web-scaffold, `Ops-web-screenshots` (real image for the OG card)
- **Touches:** `packages/web/docusaurus.config.ts` (metadata keys only), `packages/web/static/**` (robots, OG image, favicons, manifest), page front matter

## Goal
Make the site findable and shareable: unique titles and descriptions, canonical URLs, Open Graph and Twitter cards with a real image, sitemap, robots, `SoftwareApplication` JSON-LD, fast and accessible pages.

## Gates (T1)
- [x] G1 scope  - [x] G2 static (typecheck + build)  - [x] G3 existing tests (no code touched outside web; not re-run)  - [x] G4 run it (Lighthouse on the built site)
- [x] G7 docs sync (n/a: no behaviour docs change)  - [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] The `seo-checklist` skill is run and its results pasted in the PR, with anything not applicable marked
- [x] Lighthouse on `/` and one docs page: SEO 100, Accessibility 95 or more, Performance 90 or more (numbers from a real run)
- [x] OG image is 1200x630 and shows the real product, not a placeholder
- [ ] JSON-LD validates in Google's Rich Results test or the schema.org validator (or noted as not run)
- [x] `robots.txt` allows crawling and names the sitemap; no `noindex` on public pages
- [x] Home page has a unique title/description, canonical, `og:*` and `twitter:card=summary_large_image` pointing at the OG image; favicon set, web manifest and `theme-color` present (updated 2026-11-02: owner asked for the missing og image and related tags)
- [x] Docs pages inherit a default OG image and get their own titles/descriptions
- [x] Production URL comes from one config value, not scattered strings (final value set in `Ops-web-deploy`)
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes (2026-11-02, built site served on :3111 and inspected with headless Chromium)

Changed: `docusaurus.config.ts` (default `image`, `metadata`, `headTags` for apple-touch-icon and manifest, favicon, a tiny plugin that writes `robots.txt` from `SITE_URL`), `src/pages/index.tsx` (title, description, canonical, og, JSON-LD; the page sits outside Docusaurus `Layout`, so it sets these itself), `static/site.webmanifest`, `static/img/{og,favicon-32,apple-touch-icon,icon-192,icon-512}.png`. `SITE_URL` value untouched. No repo deps added (sharp, lighthouse, playwright-core live in the session scratchpad).

| Check | Result |
|---|---|
| Title unique, under 60, brand last | pass: home "Kanban for Markdown tasks in VS Code \| GITASK" (46); 7 docs titles unique, 38 to 50 |
| Description unique, 70 to 160 | pass: home 154, docs 104 to 156 |
| One h1 | pass: 1 per page; heading nesting not audited |
| Canonical absolute from `url` | pass: home `https://gitask-me.web.app/`, docs without trailing slash; 404 canonical points at its own URL (Docusaurus default, 404 is not in the sitemap) |
| og/twitter tags | pass: og:title, og:description, og:image (+ width/height/alt), og:url, twitter:card=summary_large_image, twitter:image on home; docs inherit og:image and card via `themeConfig.image` |
| OG image 1200x630, real product, under 1 MB | pass: 1200x630 PNG, 61 KB, shows board-dark.webp. The screenshot is the staged data of this repo's own Tasks board, not a promise of any task or date |
| Images alt/size/lazy | pass for Views (alt, 1280x800, lazy); hero/other landing images not re-audited |
| Links | pass: build reports no broken links. Warning (not mine): broken anchor `/#download` from docs pages in the build log |
| No noindex | pass: no robots meta in any built page |
| sitemap.xml | pass: 8 URLs (home + 7 docs), host from `SITE_URL` |
| robots.txt | pass: Allow /, `Sitemap: https://gitask-me.web.app/sitemap.xml` (generated from `SITE_URL`) |
| JSON-LD SoftwareApplication | pass (present, values true: name, DeveloperApplication, OS Windows/macOS/Linux per landing requirements, offers price 0 USD, url, downloadUrl = GitHub releases/latest, no version). Validator not run |
| Favicon set, manifest, theme-color | pass: favicon-32, apple-touch-icon, 192/512, `/site.webmanifest`, theme-color #3b82f6 (--brand-primary). Note: the source `icon.png` is 128 px, so 192/512 are upscaled and soft; supply a larger source later |
| HTTPS, one canonical host | n/a locally; canonical covers it; redirect from `*.firebaseapp.com`/`www` is a Ops-web-deploy item |
| 404 page | pass: unknown path returns 404, "Page Not Found", navbar links home. Not Firebase-verified |
| Cache headers | n/a locally (`firebase.json` not changed or checked here) |
| Content claims | pass: nothing version-specific; OS list matches the landing requirements |

Lighthouse (local build, lighthouse CLI default config, which is the mobile profile with simulated throttling):
| URL | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| `/` | 92 | 95 | 100 | 100 |
| `/docs/intro` | 90 | 100 | 100 | 100 |

Home a11y finding (out of scope, landing component): `aria-required-children` fails for the `.cli-table role="table"`/`.cli-row role="row"` structure in the CLI section; fixing it would take home to 100. Home LCP 2.5 s.

Not verified: JSON-LD in Google's Rich Results / schema.org validator; real social previews (Facebook, X, Slack); cache headers and redirects on Firebase; final production URL (placeholder `SITE_URL`); Search Console. Off-page items (Marketplace/Open VSX text, GitHub social preview) listed, not done.
