# Ops-web-refresh

- **ID:** T-0030
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new docs pages (CLI reference) and a new landing section; web package only, no release files
- **Claimed by:** claude session, 2026-10-31
- **Worktree:** `GITASK/GITASK-web-refresh/` · **Branch:** `feat/web-refresh`
- **Started / updated:** 2026-10-31 / 2026-10-31
- **Docs:** `packages/web/docs/`, `Docs/architecture/release.md`
- **Depends on:** none (0.5.0 is live on npm, Marketplace and Open VSX)
- **Touches:** `packages/web/src/landing/**`, `packages/web/src/css/custom.css`, `packages/web/docs/**`, `packages/web/sidebars.ts`, `packages/web/docusaurus.config.ts`

## Goal
Bring the landing page up to 0.5.0: install from the Marketplace (not a .vsix), CLI shown as published, a section for the 0.5.0 features and the new CLI commands. Give the docs pages a real UI (Docusaurus default styling is bare) and a CLI reference.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (tsc + build pass; `/#download` anchor warning on docs pages also exists on main)  - [x] G3 (Skipped G3 for new tests: static content, root tests untouched)  - [~] G4 run it (dark mode at desktop width only; light mode and 360 px NOT checked)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: no auth, data or input)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] Landing installs from the Marketplace first, Open VSX second; .vsix is a secondary link
- [ ] "Publishing not confirmed" copy is gone; CLI install uses `npm i -g gitask-cli` / `npx gitask-cli`
- [ ] 0.5.0 features and commands (`people`, `assign`, `subtask`, `report`, `serve`, `github`, `init`) shown, checked against `gitask help`
- [ ] Docs pages have a styled UI in light and dark; build has no broken links
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
