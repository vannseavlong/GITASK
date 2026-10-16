# Ops-web-downloads

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new API call (GitHub Releases), new feature on the page
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-downloads/` · **Branch:** `feat/web-downloads`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/requirements/landing-page.md` (download table), `Tasks/_plans/Ops-landing-page.md`
- **Depends on:** Ops-web-scaffold
- **Touches:** `packages/web/src/lib/release.ts`, `packages/web/src/lib/os.ts`, `packages/web/src/components/Download*.tsx`, `packages/web/test/**`

## Goal
Make the Download section real: detect the OS, resolve the latest release's `.vsix` from the GitHub API, show Mac/Windows/Linux cards (same file, OS-specific install command), "Install in VS Code", and a command-line tab (`npm i -g gitask-cli`, `npx gitask-cli board`), with copy buttons and fallbacks.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (OS table, asset picking, every failure state)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (release text is never rendered as HTML)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [ ] G11 changelog

## Done when
- [ ] OS detection covers macOS, Windows, Linux, mobile (all cards, no primary) and unknown
- [ ] `.vsix` found by extension, no version hard-coded anywhere
- [ ] Tested with a mocked response and these failures: network error, 403 rate limit, 404 no release, release without a `.vsix`; each shows the fallback links
- [ ] Result cached in `sessionStorage`; storage errors do not break the page
- [ ] Windows shows PowerShell form; macOS and Linux show the shell form
- [ ] Links work with JavaScript off
- [ ] Keyboard and screen-reader pass; copy button announces success
- [ ] Checked against the real release once `Ops-github-remote` is done, or noted as not tested
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
