# Ext-readme-guide

- **ID:** T-0058
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T0 · docs and static media only, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-readme-guide/` · **Branch:** `docs/readme-guide`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-06
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`; use the `docs-writer` skill
- **Depends on:** `Ops-release-0-5` merged (also edits READMEs and `packages/web/docs`), `Ops-web-screenshots` for images (GitHub README can pick a theme with `#gh-dark-mode-only` / `#gh-light-mode-only`; the Marketplace has one image, so use dark), the owner's recorded video for the video part. Agree the guide's page name with `Ops-web-docs` via `Tasks/_inbox/Ops-web-docs/`.
- **Touches:** `packages/vscode/README.md`, `packages/web/docs/getting-started.md` (new, or the name agreed with `Ops-web-docs`), `packages/web/sidebars.ts` (one entry), `packages/vscode/media/` (demo GIF/WebP only)

## Goal
Make the extension README show the product and teach it: a demo video and a usage guide, so a Marketplace visitor can get from install to a moved card without leaving the page.

## Gates (T0)
- [x] G1 scope  - [x] G7 docs sync (if docs changed)  - [ ] G8 PR message

## Done when
- [ ] README top shows a short looping demo (GIF or WebP under about 3 MB, in `packages/vscode/media/`) that links to the full video; no `<video>`/`<iframe>` (the Marketplace strips them). Image URLs work on the Marketplace (absolute HTTPS once the repo is public)
- [ ] Owner supplies the video URL; if not yet, the README keeps a clearly marked placeholder and the PR says so (Skipped: video, reason)
- [ ] README replaces `TODO(screenshot)` with real images from `Ops-web-screenshots`
- [x] Short "Getting started in 5 steps" in the README (init, create, move, assign and sub-tasks, export) linking to the full guide
- [x] Full guide in `packages/web/docs/`: the workflow end to end, plus a short "Using GITASK with coding agents" section (shared rules in `AGENTS.md`, claim a task, one worktree per task). Every command and setting checked against the real product, not copied from memory
- [x] One fact, one home: the guide links to `report.md`, `cli.md` and `github-sync.md` instead of copying them
- [x] `pnpm --filter gitask-web build` passes (no broken links); README renders on GitHub
- [ ] Root `CHANGELOG.md` entry `[Ext]` added if the README ships in a release (T0 otherwise)
- [ ] Worktree and branch removed after merge

## Notes (2026-11-02)
- Done (text): `packages/web/docs/getting-started.md` (slug `/getting-started`, incl. "Using GITASK with coding agents"), sidebar entry, README "Getting started in 5 steps". Commands and settings checked against `packages/cli/src/main.ts` and `packages/vscode/package.json`. Inbox note sent to `Tasks/_inbox/Ops-web-docs/`.
- Build passes; only warnings are the existing `/#download` anchors on every docs page (navbar, not this task).
- Remaining: demo GIF/WebP in `packages/vscode/media/` + video link (owner; `TODO(demo)` placeholders in README and guide); screenshots from `Ops-web-screenshots` (`TODO(screenshot)` in README and guide); CHANGELOG `[Ext]` if shipped in a release; G8 PR message; depends on `Ops-release-0-5` merging (README overlap). Nothing committed.

## Notes: screenshots wired (2026-11-02)
- README: board and detail images use absolute `raw.githubusercontent.com/.../img/views/*.webp` URLs with `#gh-dark-mode-only` / `#gh-light-mode-only`. Unverified: the Marketplace/Open VSX probably ignores those fragments and would show both the dark and light image, and WebP support there is unverified. Fix if so: drop the light images (dark only) and/or use PNG. Images only resolve once they are on `main` of the public repo.
- Docs page: `ThemedImage` (light/dark swap) for board and detail, `/img/views/*-{light,dark}.webp`. The worktree branch lacks these files (they are on main), so I copied them in temporarily to build (passes), then removed them; they arrive on merge/rebase.
- Still open: `TODO(demo)` GIF/video (owner).
