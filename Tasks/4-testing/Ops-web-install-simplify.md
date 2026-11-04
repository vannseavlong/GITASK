# Ops-web-install-simplify

- **ID:** T-0069
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · landing components and copy, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none (released at hand-off to testing)
- **Worktree:** `GITASK/GITASK-web-install-simplify/` · **Branch:** `feat/web-install-simplify`
- **Started / updated:** 2026-11-05 / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/Download.tsx`, `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`, `landing/content.ts`, `landing.css` (download and nav regions), `packages/web/src/lib/os.ts` and its tests, `packages/web/docs` pages that repeat per-OS steps

## Goal
The landing page never links the VS Code Marketplace where people look (it is only in the footer and a small list). Add a clear "VS Code Marketplace" button to the hero and the navbar. Remove the three per-OS cards: macOS, Windows and Linux all install the same way, so show one install block: Marketplace button, the `code --install-extension` command with the .vsix as an offline fallback, and the CLI (`npm i -g gitask-cli`). Delete OS detection code that nothing uses.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (dark theme, 390 and 1280 px only)
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [x] Marketplace link is in the hero, the navbar (and mobile menu) and the Install section; Open VSX in the Install section and footer, with the existing Marketplace URL from `content.ts`
- [x] One install section, no OS cards, no OS detection; the latest-release lookup stays only if the .vsix link still needs it
- [x] Docs: `docs/install.md` already has one set of steps, no per-OS pages found; no change
- [ ] Mobile width, light and dark, no layout shift; Lighthouse (dark mobile+desktop checked by eye; light and Lighthouse NOT run)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
