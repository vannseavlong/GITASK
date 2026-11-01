# Ops-web-landing-fixes

- **ID:** <assigned by GITASK when created>
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · small UI fixes in one package, no shared logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-landing-fixes/` · **Branch:** `fix/web-landing-fixes`
- **Started / updated:** none / 2026-11-02
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/Navbar.tsx`, `Footer.tsx`, new `components/GitHubIcon.tsx`, `packages/web/src/landing/content.ts` (`navItems`, new `links.portfolio`), `packages/web/src/landing/landing.css` (navbar rules only)

## Goal
Fix the four landing-page issues the owner reported: navbar label, GitHub icon, dead hamburger menu, and the missing portfolio link.

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 existing tests  - [ ] G4 run it (quick, 360 and 1280 px)
- [ ] G7 docs sync (if the contract is touched)  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Navbar item reads "What's new" (no version number) and still scrolls to `#whats-new`
- [ ] Navbar and footer use a real GitHub mark (inline SVG component, no new dependency), with an `aria-label`
- [ ] Hamburger: reproduced first at 360 px in a real browser and the root cause written in the PR; tapping opens the menu, a link tap or a second tap closes it, Escape closes it, `aria-expanded` is correct; also checked at 768 to 1000 px, dark and light
- [ ] Portfolio link `https://vann-seavlong.vercel.app/` in the footer ("Built by Vann Seavlong", `rel="noreferrer"`, opens in a new tab), stored in `links` in `content.ts`
- [ ] Docs pages' Docusaurus navbar unaffected; `pnpm --filter gitask-web build` and `typecheck` pass with no broken links
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
