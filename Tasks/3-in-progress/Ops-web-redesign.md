# Ops-web-redesign

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · replaces the landing page UI in `packages/web`, new dependency (`lucide-react`)
- **Claimed by:** claude session, 2026-10-17
- **Worktree:** `GITASK/GITASK-web-redesign/` · **Branch:** `feat/web-redesign`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/requirements/web-redesign-brief.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/**`, `packages/web/src/pages/index.tsx`, `packages/web/docusaurus.config.ts` (colorMode), `packages/web/package.json`

## Goal
Port the Figma Make landing page (`~/Downloads/Redesign GITASK Landing Page`) into Docusaurus. Docs keep the Docusaurus navbar/footer.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (tsc + build pass; broken-anchor warning for `/#download` although the id is in the built HTML)
- [ ] G3 tests  - [~] G4 run it (1280 wide, dark and light toggle checked; 360 and 768 NOT checked)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G11 changelog

## Notes
- `src/landing/theme.css` holds all tokens; `landing.css` is the Figma CSS nested under `.landing` so it cannot leak into docs. Tailwind and Vite were dropped (the export used plain CSS only).
- Navbar theme toggle uses Docusaurus `useColorMode`; default mode is now dark. The page uses `Layout/Provider` and its own navbar/footer.
- Left: 360/768 check, Download states (loading/error/no-JS), `#download` anchor warning, G5-G11.
