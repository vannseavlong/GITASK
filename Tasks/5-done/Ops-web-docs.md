# Ops-web-docs

- **ID:** T-0007
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · docs content and sidebar config in one package
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-docs/` · **Branch:** `feat/web-docs`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-09
- **Docs:** `Tasks/_plans/Ops-landing-page.md`; run the `docs-writer` skill first
- **Depends on:** Ops-web-scaffold
- **Touches:** `packages/web/docs/**`, `packages/web/sidebars.ts`, local search plugin dependency in `packages/web/package.json`

## Goal
User documentation on the site: Getting started (install, first board), Task format (folders, header fields, sub-tasks, `Due`, `Depends on`), CLI reference (`board`, `move`, `new`, `changelog`), the VS Code views, FAQ. Local search, no Algolia account.

## Gates (T1)
- [x] G1 scope  - [x] G2 static (build has no broken links; typecheck passes)  - [x] G3 existing tests (Skipped: no code changed, only docs/config)  - [x] G4 run it (built site served, search checked in headless Chromium)
- [ ] G7 docs sync (README links here, does not copy)  - [ ] G8 PR message  - [x] G11 changelog

## Done when
- [x] Every command and flag in the CLI reference is checked against `gitask help` of the built CLI
- [x] Pages for views not yet built are marked "coming soon", not described as working
- [x] One fact, one place: no copy of `Docs/` internals; links instead
- [x] Search finds a term from each page
- [x] Docusaurus build reports no broken links or anchors
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes
- Added `task-format`, `views`, `faq` pages and sidebar entries. All six views are live in 0.5.0, so none is marked coming soon. CLI reference matches `npx gitask-cli --help` and `packages/cli/src/main.ts` (no change needed).
- Search: `@easyops-cn/docusaurus-search-local` 0.55.3 (2026-07-29), peer deps allow Docusaurus 3 and React 19. Needed a `themes` entry in `packages/web/docusaurus.config.ts` (outside `Touches`; 8 lines, other web tasks should merge around it) and `pnpm-lock.yaml` changed.
- Build: no broken links. Broken-anchor warnings for `/#download` appear on every page (404 and /search too), so they come from the navbar/footer link, not the docs pages. `id="download"` exists in `src/landing/components/Download.tsx` but is a React page Docusaurus cannot see; pre-existing.
- Search checked in headless Chromium on the built site: a term from each of the 11 docs pages returns a snippet from that page.
- Not verified: the pages were not read visually in a browser; the demo video and screenshots TODOs in intro/getting-started remain; the `late` tag, move-commit conditions in the FAQ come from code reading, not a run.
