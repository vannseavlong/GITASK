# Ops-web-scaffold

- **ID:** T-0014
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new site and workspace package (`packages/web`), new route/feature
- **Claimed by:** claude session, 2026-10-17
- **Worktree:** `GITASK/GITASK-web-scaffold/` · **Branch:** `feat/web-scaffold`
- **Started / updated:** 2026-10-17 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Docs/requirements/landing-page.md`, `Tasks/_plans/Ops-landing-page.md`
- **Depends on:** none
- **Touches:** `packages/web/**` (new), root `package.json` scripts, root `.gitignore` only if needed

## Goal
Create `packages/web` as a Docusaurus 3 site (React, TypeScript) with the portfolio brand in one `src/css/custom.css`, and a custom home page (`src/pages/index.tsx`): hero, views preview, features, how it works, footer. The Download section is a static placeholder with its final layout; `Ops-web-downloads` makes it live.

## Gates (T2)
- [x] G1 scope  - [x] G2 static (tsc + docusaurus build, no broken links)  - [x] G3 tests (root 10/10 pass; Skipped G3 for new tests: no logic in the page)  - [~] G4 run it (viewed at 1280 wide, dark mode; 360 px and light mode NOT verified, the browser window would not go below desktop width)
- [ ] G5 code review  - [ ] G6 security (Skipped G6: no auth, data or user input; recheck at testing)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [x] `pnpm --filter gitask-web build` and `typecheck` pass; root `pnpm test` still passes
- [x] Brand tokens and Inter come from one CSS file; buttons match the portfolio `.btn-primary` / `.btn-secondary`
- [ ] Looks right at 360, 768 and 1280 px in a real browser (screenshots in the PR)
- [ ] Extension icon reused; placeholder images clearly marked until real screenshots exist
- [x] Site does not import `gitask-core`; the CLI and extension bundles are unchanged
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes (2026-10-17)
- Built, uncommitted, in `GITASK-web-scaffold/` (leave commits to the owner). Added `core-js: false` to `pnpm-workspace.yaml` (pnpm 11 fails install on ignored build scripts) and `build/`, `.docusaurus/` to `.gitignore`.
- Views other than Board are labelled "Coming soon"; the hero board is an illustration, marked as such, until a real screenshot exists.
- Production URL `https://gitask.web.app` in `docusaurus.config.ts` is a placeholder; `Ops-web-deploy` sets the real one.
- Left: check 360 px and light mode, G5 review by a fresh agent, G7, G8, G11 changelog.
