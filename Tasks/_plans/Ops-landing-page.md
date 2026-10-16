# Website plan (landing + docs)

Updated: 2026-10-17 · Requirements and brand: `Docs/requirements/landing-page.md` (not repeated here). Product views plan: `Tasks/_plans/Ext-views.md`.

## Goal
A public site where a visitor learns what GITASK is, downloads it for their OS or copies the command-line install, and reads the docs, without opening GitHub. Built to be found: SEO and store-listing work are part of the plan.

## Decisions (settled with the owner, 2026-10-17)
- **One `.vsix` for macOS, Windows and Linux is accepted for v1.** Native binaries stay in the backlog.
- **Hosting: Firebase Hosting.** The owner creates the Firebase project/site and secrets; the agent never does.
- **React.** The site is built on **Docusaurus 3** (React, MDX, the most used docs framework for open-source dev tools). It gives docs, versioned sidebar, sitemap, meta tags and fast static output for free, and the landing page is a custom React page (`src/pages/index.tsx`) on top of it. This replaces the earlier Vite idea: one site instead of a landing plus a separate docs site.
- **Brand:** portfolio palette (requirements doc); Docusaurus theme variables hold the tokens in one CSS file.
- **Docs home:** user docs live in `packages/web/docs/` and nowhere else; `Docs/` stays the internal engineering docs, and the README links to the site instead of copying it.
- **Task prefix:** `Ops` (not `Web`) so `AGENTS.md` is not edited.

## Flow
| Step | State |
|---|---|
| Visitor lands on `/`: hero, board preview, features, downloads | new |
| Site detects OS and resolves the latest release from the GitHub Releases API at runtime | new |
| Primary button downloads the `.vsix`; other OS cards, "Install in VS Code" and the CLI tab beside it; fallbacks to the Releases page and Marketplace | new |
| Visitor reads `/docs`: getting started, task format, CLI reference, views | new |
| Search engines index it: titles, descriptions, Open Graph, sitemap, `SoftwareApplication` JSON-LD | new |
| Merge to `main` builds and deploys to Firebase; a new tag needs no site redeploy | new |

## Screens and states
Home (hero · what it does · views preview · download · how it works · footer) and docs pages. Download states: detecting, detected, loading, failed (fallback links), no release yet, unknown OS (equal cards), phone width (cards stack, CLI first).

## Data and API
One external call: GitHub Releases API, unauthenticated, read-only, cached in `sessionStorage`. No backend, secrets in the page, or analytics in v1. No `Docs/api` or backend-request entry needed (public API, not another team).

## Gaps
- Repo not pushed yet (`Ops-github-remote`, owner approval): downloads are built and tested against a mocked release until then.
- Release asset names contain the version, so the page resolves the asset by extension from the API; `release.yml` is not edited.
- Search: Algolia DocSearch needs an application. Decision: local search plugin in v1 (no account).
- No GITASK logo or social image exists: reuse the extension icon; the board screenshot/GIF is taken from the real extension (`Ops-publish-prep` also needs it, so share one capture).

## Open questions (recommendation)
1. Firebase site id and domain: free `*.web.app` URL or custom domain? Recommend `*.web.app` for v1.
2. Algolia DocSearch later? Recommend only after real traffic.

## Task breakdown
| Task | Depends on | Tier | Size |
|---|---|---|---|
| Ops-web-scaffold (Docusaurus, theme, home sections) | none | T2 | 1d |
| Ops-web-downloads (OS detect, release fetch, CLI tab) | scaffold | T2 | 1d |
| Ops-web-docs (user docs pages, sidebar, local search) | scaffold | T1 | 1d |
| Ops-web-seo (meta, OG image, sitemap, robots, JSON-LD, Lighthouse) | scaffold | T1 | 0.5d |
| Ops-web-deploy (CI build + Firebase deploy) | downloads, docs, seo, Ops-github-remote | T3 | 0.5d |

Parallel after scaffold: downloads, docs and seo touch different files (`src/components/Download*`, `docs/`, `docusaurus.config` seo keys and `static/`). `docusaurus.config.ts` is shared: downloads and docs do not edit it; seo owns the metadata keys and docs owns `sidebars.ts`. Anything else needing the config goes through an inbox note.

## Skills added for the site
`seo-checklist`, `launch-checklist` (store listings and distribution), `docs-writer`: in `.claude/skills/`. Tasks name the skill their agent must run before moving to testing.

## Out of scope
Native binaries, auto-update, analytics, blog, dark-mode polish beyond Docusaurus defaults, i18n, download counter, code signing.
