# Ext-readme-guide

- **ID:** <assigned by GITASK when created>
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T0 · docs and static media only, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-readme-guide/` · **Branch:** `docs/readme-guide`
- **Started / updated:** none / 2026-11-02
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`; use the `docs-writer` skill
- **Depends on:** `Ops-release-0-5` merged (also edits READMEs and `packages/web/docs`), `Ops-web-screenshots` for images (GitHub README can pick a theme with `#gh-dark-mode-only` / `#gh-light-mode-only`; the Marketplace has one image, so use dark), the owner's recorded video for the video part. Agree the guide's page name with `Ops-web-docs` via `Tasks/_inbox/Ops-web-docs/`.
- **Touches:** `packages/vscode/README.md`, `packages/web/docs/getting-started.md` (new, or the name agreed with `Ops-web-docs`), `packages/web/sidebars.ts` (one entry), `packages/vscode/media/` (demo GIF/WebP only)

## Goal
Make the extension README show the product and teach it: a demo video and a usage guide, so a Marketplace visitor can get from install to a moved card without leaving the page.

## Gates (T0)
- [ ] G1 scope  - [ ] G7 docs sync (if docs changed)  - [ ] G8 PR message

## Done when
- [ ] README top shows a short looping demo (GIF or WebP under about 3 MB, in `packages/vscode/media/`) that links to the full video; no `<video>`/`<iframe>` (the Marketplace strips them). Image URLs work on the Marketplace (absolute HTTPS once the repo is public)
- [ ] Owner supplies the video URL; if not yet, the README keeps a clearly marked placeholder and the PR says so (Skipped: video, reason)
- [ ] README replaces `TODO(screenshot)` with real images from `Ops-web-screenshots`
- [ ] Short "Getting started in 5 steps" in the README (init, create, move, assign and sub-tasks, export) linking to the full guide
- [ ] Full guide in `packages/web/docs/`: the workflow end to end, (a user guide for the extension, not agent instructions). Every command and setting checked against the real product, not copied from memory
- [ ] One fact, one home: the guide links to `report.md`, `cli.md` and `github-sync.md` instead of copying them
- [ ] `pnpm --filter gitask-web build` passes (no broken links); README renders on GitHub
- [ ] Root `CHANGELOG.md` entry `[Ext]` added if the README ships in a release (T0 otherwise)
- [ ] Worktree and branch removed after merge
