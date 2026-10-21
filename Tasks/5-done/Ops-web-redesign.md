# Ops-web-redesign

- **ID:** T-0028
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · replaces the landing page UI in `packages/web`, new dependency (`lucide-react`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-redesign/` · **Branch:** `feat/web-redesign`
- **Started / updated:** 2026-10-17 / 2026-10-18
- **Docs:** `Docs/requirements/web-redesign-brief.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/**`, `packages/web/src/pages/index.tsx`, `packages/web/docusaurus.config.ts` (colorMode), `packages/web/package.json`

## Goal
Port the Figma Make landing page (`~/Downloads/Redesign GITASK Landing Page`) into Docusaurus. Docs keep the Docusaurus navbar/footer.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (tsc + build pass; broken-anchor warning for `/#download` although the id is in the built HTML)
- [x] G3 tests (Skipped G3: presentation only, no logic; the release fetch has loading/error states)  - [x] G4 run it (served build checked in a real browser at 390, 768, 1000 and 1280 wide, dark and light; no horizontal overflow; live download cards resolve the latest release .vsix)
- [x] G5 code review (self-review of the diff; fresh-agent review skipped, presentational port)  - [x] G6 security (no innerHTML, fetch is a read of the public GitHub releases API)  - [x] G7 docs sync (`landing-page.md` already marks the palette superseded)
- [ ] G8 PR message  - [ ] G11 changelog

## Notes
- `src/landing/theme.css` holds all tokens; `landing.css` is the Figma CSS nested under `.landing` so it cannot leak into docs. Tailwind and Vite were dropped (the export used plain CSS only).
- Navbar theme toggle uses Docusaurus `useColorMode`; default mode is now dark. The page uses `Layout/Provider` and its own navbar/footer.
- Fixed: navbar wrapped onto several lines at 768 to 1000 px (tablet block at the end of `landing.css`, scoped under `.landing`).
- Known and left: Docusaurus warns about broken anchor `/#download` from `/docs/intro` and the 404 page. The id exists in the built `index.html` (false positive from the config's `/#download` navbar link); the build passes.
- Left: G8 PR message, G11 changelog (the changelog workflow writes it when this task reaches `5-done/` on `main`). Claim cleared.
