# Landing polish, SEO and extension README

Updated: 2026-11-02 · Requirements: `Docs/requirements/landing-page.md`, `web-redesign-brief.md` (not repeated). Parent plan: `Tasks/_plans/Ops-landing-page.md`.

## Goal
Fix what the owner saw on the live landing page (nav label, GitHub icon, dead hamburger, drawn instead of real screenshots, no portfolio link), finish SEO so shared links look right, and make the extension README sell and teach the product (demo video, usage guide).

## Flow
| Step | State |
|---|---|
| Visitor sees navbar: "New in 0.5" link to `#whats-new` | **change** → "What's new" (never carries a version, so it does not go stale) |
| Navbar and footer GitHub link use `GitFork` (lucide) | **change** → real GitHub mark (lucide dropped brand icons; use an inline SVG, one shared component) |
| Phone width: hamburger toggles `.nav-links.is-open` | **change**: owner reports clicking does nothing; reproduce, fix root cause |
| Views section shows CSS-drawn thumbnails (`Thumbnail` in `Views.tsx`) | **change** → real screenshots of this repo's own `Tasks/` board rendered by `gitask serve` |
| Link to the owner's portfolio `https://vann-seavlong.vercel.app/` | **new** (footer "Built by", plus hero/final-CTA only if the design has room) |
| Home `<head>`: title, description only | **change** → canonical, OG/Twitter image, JSON-LD, manifest, robots |
| Extension README: text only, `TODO(screenshot)` | **change** → demo video + "how to use" guide |

## Screens and states
- Navbar at 360, 768, 1280 px, dark and light; menu closed, open, and after a link click (must close).
- Views: one screenshot per view (Board, Task detail, List, Timeline, Overview) in **dark and light**; the site theme switch swaps them (decided 2026-11-02). Loading: images have width/height (no layout shift); below the fold lazy.
- README: renders on GitHub, Marketplace and Open VSX (video behaviour differs, see Gaps).

## Data and API
None. No backend, no new runtime dependency. Screenshots come from `npx gitask-cli serve` run on this repo (local, token URL), captured at one fixed window size.

## Gaps and decisions
- **Hamburger root cause unknown.** Not found by reading code: the toggle, `.is-open` and the `max-width: 767px` rules look right. Task must reproduce in a real browser at 360 px first. Suspects: Infima `.navbar` rules winning over `.nav-links`/`.menu-button`; the `backdrop-filter` on `.navbar`; z-index/overflow of the absolutely positioned `.nav-links`; `<Navbar>` mounted outside Docusaurus's own navbar provider. No fix is guessed in the plan.
- **GitHub icon.** `lucide-react` has no brand icons. Decision: one small inline-SVG `GitHubIcon` component used by Navbar and Footer; no new dependency.
- **Views and the capture are shared.** The same real screenshots feed the Views section, the OG image and the README. One capture session, one set of files in `packages/web/static/img/views/`; the README links to them by absolute URL (Marketplace needs HTTPS, not relative paths into `static/`). This also closes the screenshot placeholders listed in `Ops-release-0-5` (that task is in testing; coordinate through `Tasks/_inbox/Ops-release-0-5/`, do not edit it).
- **SEO already has a task**, `Ops-web-seo` (T-0009), with the checklist, Lighthouse targets and "real product" OG image. Not duplicated: the plan sequences it after the screenshots and adds two rows to it (below). `Tasks/1-backlog/WEB-SEO.md` is an empty template stub; it should be deleted by the owner or reused, not built on.
- **SITE_URL is still a placeholder** (`https://gitask-me.web.app` in `docusaurus.config.ts`); `Ops-web-deploy` sets the real value. SEO must read it from that one constant, so canonical and OG URLs are right the day the URL is set. Dependency, not a blocker for the work.
- **Video on the Marketplace.** The Marketplace strips `<video>`/`<iframe>` and only renders images from HTTPS. Decision: README shows a short looping GIF/WebP (under about 3 MB) that links to the full video; GitHub also gets the linked thumbnail. The recording itself is human work (see Open questions).
- **Where the usage guide lives.** `AGENTS.md`: one fact, one home. The full guide goes in `packages/web/docs/` (the user docs home, `docs-writer` skill); the extension README carries a short "Getting started in 5 steps" and links to it. The existing README sections (Use it, People, Settings) stay; the guide adds the missing workflow: init, create, move, assign, sub-tasks, export.
- **Overlap.** `Ops-release-0-5` (testing) touches READMEs and `packages/web/docs`; `Ops-web-docs` (todo) touches `packages/web/docs/**` and `sidebars.ts`. The guide task must start after `Ops-release-0-5` merges and agree its page name with `Ops-web-docs` through the inbox.

## Decisions from the owner (2026-11-02)
1. The guide is a **user guide** for using the extension (not an agent-instruction file).
2. Demo video: follow common extension practice: a looping GIF/WebP in the README that links to the full video on YouTube (unlisted is fine). Owner records and uploads; the agent only wires the links.
3. Screenshots in **both themes**, matching the site's theme switch.
4. Portfolio link in the footer ("Built by Vann Seavlong") and the Community column only, not the navbar.

No open questions remain.

## Task breakdown
| # | Task | Repo | Depends on | Tier | Size |
|---|---|---|---|---|---|
| 1 | `Ops-web-landing-fixes`: nav label, GitHub icon, hamburger fix, portfolio link | GITASK | none | T1 | 0.5 day |
| 2 | `Ops-web-screenshots`: capture real screenshots, replace drawn Views thumbnails | GITASK | 1 (same files: `content.ts`, `landing.css`) | T1 | 1 day |
| 3 | `Ops-web-seo` (existing, T-0009, updated): OG image from a real screenshot, canonical, JSON-LD, manifest, robots | GITASK | 2, `Ops-web-scaffold` merged | T1 | 1 day |
| 4 | `Ext-readme-guide`: extension README demo video + usage guide page | GITASK | 2 (images), `Ops-release-0-5` merged, owner's video | T0 | 1 day |

Parallel: **1** can start now. **2** starts when 1 merges. **3** and **4** can run in parallel after 2 (3 touches `docusaurus.config.ts`/`static`, 4 touches `packages/vscode/README.md` and `packages/web/docs`; no shared files). The guide text in 4 does not need the screenshots and may start earlier; only its images and the video do.

## Out of scope
Custom domain and hosting (`Ops-web-deploy`), Algolia search, redesigning sections other than Views, analytics, a native-binary download, recording the video (owner).
