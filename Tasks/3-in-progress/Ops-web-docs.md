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
- [ ] G1 scope  - [ ] G2 static (build has no broken links)  - [ ] G3 existing tests  - [ ] G4 run it (quick: read each page in the built site)
- [ ] G7 docs sync (README links here, does not copy)  - [ ] G8 PR message  - [ ] G11 changelog

## Done when
- [ ] Every command and flag in the CLI reference is checked against `gitask help` of the built CLI
- [ ] Pages for views not yet built are marked "coming soon", not described as working
- [ ] One fact, one place: no copy of `Docs/` internals; links instead
- [ ] Search finds a term from each page
- [ ] Docusaurus build reports no broken links or anchors
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
