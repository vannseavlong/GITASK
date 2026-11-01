# Ops-web-screenshots

- **ID:** <assigned by GITASK when created>
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · component change plus static assets, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-screenshots/` · **Branch:** `feat/web-screenshots`
- **Started / updated:** none / 2026-11-02
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`, `Docs/requirements/web-redesign-brief.md`
- **Depends on:** `Ops-web-landing-fixes` (same files: `content.ts`, `landing.css`)
- **Touches:** `packages/web/static/img/views/**` (new), `packages/web/src/landing/components/Views.tsx`, `packages/web/src/landing/content.ts` (`views`), `packages/web/src/landing/landing.css` (Views rules only)

## Goal
Replace the CSS-drawn Views thumbnails with real screenshots of this repo's own `Tasks/` board, rendered by `npx gitask-cli serve`. These same images are reused by `Ops-web-seo` (OG image) and `Ext-readme-guide`.

## Gates (T1)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 existing tests  - [ ] G4 run it (quick, 360, 768, 1280 px)
- [ ] G7 docs sync (if the contract is touched)  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] One screenshot each for Board, Task detail, List, Timeline, Overview in **both dark and light** (10 images), same window size, no personal data or tokens visible (the serve URL token must not appear)
- [ ] Files are WebP, each under about 200 KB, named `board-dark.webp`, `board-light.webp` etc. in `static/img/views/`; originals/PNG kept out of the repo
- [ ] `Views.tsx` shows them with meaningful `alt`, `width`/`height` set, `loading="lazy"`; the drawn `Thumbnail` and its `.thumb-*` CSS are removed (no dead code)
- [ ] The Hero's "Illustrative product preview" caption is left unless the owner asks; noted in the PR if a real board shot would fit there
- [ ] No layout shift; cards still stack on phone width; the image follows the site theme switch (no flash of the wrong theme on load; use CSS show/hide that works with Docusaurus colour mode)
- [ ] Image paths and the capture steps (command, window size) are written in the PR so `Ext-readme-guide` and `Ops-web-seo` reuse them
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
