# Ops-web-screenshots

- **ID:** T-0057
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · component change plus static assets, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-screenshots/` · **Branch:** `feat/web-screenshots`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`, `Docs/requirements/web-redesign-brief.md`
- **Depends on:** `Ops-web-landing-fixes` (same files: `content.ts`, `landing.css`)
- **Touches:** `packages/web/static/img/views/**` (new), `packages/web/src/landing/components/Views.tsx`, `packages/web/src/landing/content.ts` (`views`), `packages/web/src/landing/landing.css` (Views rules only)

## Goal
Replace the CSS-drawn Views thumbnails with real screenshots of this repo's own `Tasks/` board, rendered by `npx gitask-cli serve`. These same images are reused by `Ops-web-seo` (OG image) and `Ext-readme-guide`.

## Gates (T1)
- [x] G1 scope  - [x] G2 static  - [x] G3 existing tests (typecheck + build pass; no web tests)  - [x] G4 run it (360, 768, 1280 px, dark and light)
- [x] G7 docs sync (n/a, no contract touched)  - [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] One screenshot each for Board, Task detail, List, Timeline, Overview in **both dark and light** (10 images), same window size, no personal data or tokens visible (the serve URL token must not appear)
- [x] Files are WebP, each under about 200 KB, named `board-dark.webp`, `board-light.webp` etc. in `static/img/views/`; originals/PNG kept out of the repo
- [x] `Views.tsx` shows them with meaningful `alt`, `width`/`height` set, `loading="lazy"`; the drawn `Thumbnail` and its `.thumb-*` CSS are removed (no dead code)
- [x] The Hero's "Illustrative product preview" caption is left unless the owner asks; noted in the PR if a real board shot would fit there
- [x] No layout shift; cards still stack on phone width; the image follows the site theme switch (no flash of the wrong theme on load; use CSS show/hide that works with Docusaurus colour mode)
- [ ] Image paths and the capture steps (command, window size) are written in the PR so `Ext-readme-guide` and `Ops-web-seo` reuse them
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes
- Capture: throwaway git repo (copy of `Tasks/`, claims reset to `none`, Due dates added to tasks, a Sub-tasks list added to Ops-web-landing-fixes so Timeline/Detail are not empty). `node packages/cli/dist/gitask.js serve --no-open --no-commit --dir Tasks --port 4180`; headless Chromium via playwright, viewport 1280x800, deviceScaleFactor 1, `colorScheme` dark/light, no URL bar so no token visible. Converted PNG to WebP with sharp (quality 82, 36-81 KB). PNGs and scripts stay in the scratchpad, not the repo.
- Images: `packages/web/static/img/views/{board,detail,list,timeline,overview}-{dark,light}.webp`. Detail shows Ops-web-landing-fixes, Timeline is the calendar.
- Wiring: `Views.tsx` renders both themes, `[data-theme='...'] &` hides one (landing.css is nested under `.landing`, so the selector needs `&`). Hero caption left unchanged; a real board shot would fit there.
- Not done: optional GIF.
