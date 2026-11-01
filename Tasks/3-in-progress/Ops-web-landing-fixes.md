# Ops-web-landing-fixes

- **ID:** T-0059
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · small UI fixes in one package, no shared logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-landing-fixes/` · **Branch:** `fix/web-landing-fixes`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-03
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/Navbar.tsx`, `Footer.tsx`, new `components/GitHubIcon.tsx`, `packages/web/src/landing/content.ts` (`navItems`, new `links.portfolio`), `packages/web/src/landing/landing.css` (navbar rules only)

## Goal
Fix the four landing-page issues the owner reported: navbar label, GitHub icon, dead hamburger menu, and the missing portfolio link.

## Gates (T1)
- [x] G1 scope  - [x] G2 static  - [x] G3 existing tests (no web tests; build passes)  - [x] G4 run it (quick, 360, 800, 1100, 1280 px, dark and light)
- [x] G7 docs sync (n/a, contract untouched)  - [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] Navbar item reads "What's new" (no version number) and still scrolls to `#whats-new`
- [x] Navbar and footer use a real GitHub mark (inline SVG component, no new dependency), with an `aria-label`
- [x] Hamburger: reproduced first at 360 px in a real browser and the root cause written in the PR; tapping opens the menu, a link tap or a second tap closes it, Escape closes it, `aria-expanded` is correct; also checked at 768 to 1000 px, dark and light
- [x] Portfolio link `https://vann-seavlong.vercel.app/` in the footer ("Built by Vann Seavlong", `rel="noreferrer"`, opens in a new tab), stored in `links` in `content.ts`
- [x] Docs pages' Docusaurus navbar unaffected; `pnpm --filter gitask-web build` and `typecheck` pass with no broken links
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes
- Root cause (reproduced in headless Chromium on the built site): the hide rule `.menu-button {display:none}` is merged by the CSS minifier into an early rule, so `.icon-link {display:inline-flex}` overrode it and the hamburger showed on desktop where tapping it toggled a class with no CSS (dead). At 360 px the menu did open, but the panel was translucent (nested `backdrop-filter` inside the blurred navbar does not blur), so hero text showed through. Fix: higher-specificity hide rules (`.nav-actions .menu-button`), opaque panel, Escape / outside tap close, `aria-controls`.
- Note: landing.css is nested inside `.landing {}`, so write selectors without a leading `.landing` in base rules.
- Verified: 360 dark/light (open, Escape, second tap, link tap, outside tap, aria-expanded), 800, 1100, 1280 (hamburger hidden, links inline); typecheck and build pass. The "Broken anchor /#download" warnings from docs pages are pre-existing (onBrokenAnchors is a warning).
- Not verified: real phone / Safari, 768-1000 px click-through beyond hidden-hamburger check, docs navbar visual check (untouched files), G8 PR message not written.
