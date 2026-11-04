# Ops-web-install-simplify

- **ID:** T-0069
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · landing components and copy, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-install-simplify/` · **Branch:** `feat/web-install-simplify`
- **Started / updated:** none / 2026-11-05
- **Docs:** `Tasks/_plans/Ext-ux-and-branding.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/Download.tsx`, `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`, `landing/content.ts`, `landing.css` (download and nav regions), `packages/web/src/lib/os.ts` and its tests, `packages/web/docs` pages that repeat per-OS steps

## Goal
The landing page never links the VS Code Marketplace where people look (it is only in the footer and a small list). Add a clear "VS Code Marketplace" button to the hero and the navbar. Remove the three per-OS cards: macOS, Windows and Linux all install the same way, so show one install block: Marketplace button, the `code --install-extension` command with the .vsix as an offline fallback, and the CLI (`npm i -g gitask-cli`). Delete OS detection code that nothing uses.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Marketplace link (and Open VSX) is in the hero, the navbar and the Install section, with the existing Marketplace URL from `content.ts`
- [ ] One install section, no OS cards, no OS detection; the latest-release lookup stays only if the .vsix link still needs it
- [ ] Docs pages that describe per-OS steps are merged into one set of steps (docs-writer skill)
- [ ] Mobile width, light and dark, no layout shift; Lighthouse does not drop below the current scores (seo-checklist)
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
