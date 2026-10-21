# Ext-marketplace-metadata

- **ID:** T-0019
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · release: ships 0.3.1 (version bump, manifest and README that the Marketplace scans); no code logic change
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-marketplace-fix/` · **Branch:** `fix/marketplace-metadata`
- **Started / updated:** 2026-10-18 / 2026-10-21
- **Due:** none
- **Docs:** `Docs/architecture/release.md`, `Docs/architecture/setupguide.md`
- **Depends on:** none
- **Touches:** `packages/vscode/README.md`, `packages/vscode/package.json` (keywords, version), `packages/cli/package.json` (version), `CHANGELOG.md`

## Goal
The VS Code Marketplace rejects the 0.3.0 `.vsix` ("Your extension has suspicious content. Please fix your extension metadata"), so 0.3.0 is only on npm, Open VSX and GitHub, and VS Code users cannot auto-update. Find which metadata is flagged and ship 0.3.1 that the Marketplace accepts.

## Findings (manual uploads on 2026-10-18)
- A: real README + keywords, stub `extension.js` → **rejected**.
- B: real `extension.js`, 3-line README, no keywords (v0.0.2) → **accepted** (verifying).
- So the bundle (including `new Function`) is not the cause; the README and/or the keywords are.
- C (real `extension.js`, real README, no keywords, v0.0.3) → **accepted** (live). So the README is fine and a keyword (`kanban`, `tasks`, `git`, `markdown`, `board` or `agents`) was flagged.
- Fix: drop `agents` (the likeliest suspect) and upload 0.3.1. If rejected, drop the next keyword, or ship without keywords (proven by C).
- Test versions 0.0.1/0.0.2/0.0.3 may be live on the Marketplace listing; remove them after 0.3.1 is out (a latest version cannot be deleted).

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (existing pass; no logic changed)  - [ ] G4 run it (the Marketplace accepts the upload)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync (setupguide: note the PAT retirement 2026-12-01 and the manual upload path)
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Marketplace accepts the 0.3.1 `.vsix` and shows it as the latest version
- [x] `node scripts/check-release.mjs v0.3.1` prints `stable`
- [ ] Root `CHANGELOG.md` entry added
- [x] Test versions removed from the Marketplace
- [x] Worktree and branch removed after merge

## Release plan (G10)
- Rollback: none needed for the code; a bad metadata change is fixed forward with 0.3.2 (published versions are final).
- Tag `v0.3.1` publishes npm, Open VSX and the GitHub Release. The Marketplace step is skipped until `VSCE_PAT` exists, so upload the same `.vsix` by hand on the manage page.
- Owner: commit, merge, tag, approve the `release` environment, upload to the Marketplace.
