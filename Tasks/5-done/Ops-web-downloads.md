# Ops-web-downloads

- **ID:** T-0008
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · new API call (GitHub Releases), new feature on the page
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-downloads/` · **Branch:** `feat/web-downloads`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-09
- **Docs:** `Docs/requirements/landing-page.md` (download table), `Tasks/_plans/Ops-landing-page.md`
- **Depends on:** Ops-web-scaffold
- **Touches:** `packages/web/src/lib/release.ts`, `packages/web/src/lib/os.ts`, `packages/web/src/landing/components/Download.tsx` (the landing moved to `src/landing`), `packages/web/test/**`

## Goal
Make the Download section real: detect the OS, resolve the latest release's `.vsix` from the GitHub API, show Mac/Windows/Linux cards (same file, OS-specific install command), "Install in VS Code", and a command-line tab (`npm i -g gitask-cli`, `npx gitask-cli board`), with copy buttons and fallbacks.

## Gates (T2)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests (OS table, asset picking, every failure state)  - [x] G4 run it
- [x] G5 code review (fresh agent: no serious issues; 6 findings fixed)  - [x] G6 security (release text is never rendered as HTML)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional at T2)  - [x] G11 changelog

## Done when
- [x] OS detection covers macOS, Windows, Linux, mobile (all cards, no primary) and unknown
- [x] `.vsix` found by extension, no version hard-coded anywhere
- [x] Tested with a mocked response and these failures: network error, 403 rate limit, 404 no release, release without a `.vsix`; each shows the fallback links
- [x] Result cached in `sessionStorage`; storage errors do not break the page
- [x] Windows shows PowerShell form; macOS and Linux show the shell form
- [x] Links work with JavaScript off
- [x] Keyboard and screen-reader pass; copy button announces success
- [x] Checked against the real release once `Ops-github-remote` is done, or noted as not tested (done against v0.5.0, see Notes)
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## Notes (agent, 2026-11-02)
- Built: `src/lib/os.ts`, `src/lib/release.ts` (pure, no DOM), rewritten `Download.tsx`, CSS in the download region of `landing.css`, tests `packages/web/test/{os,release}.test.ts` (19 tests, `node --test`, no new deps). `packages/web` got a `test` script; root `pnpm test` now also globs `packages/web/test/*.test.ts`.
- Outside `Touches`, minimal: root `package.json` (test glob), `packages/web/package.json` (test script), `Docs/architecture/release.md` (one line: page picks the `.vsix` by extension; keep one `.vsix` per release), `landing.css` (download region + `.sr-only`), `CHANGELOG.md`.
- Root `pnpm test`: 347/348 pass. The one failure, core "outside a git repo only the current folder is checked", is not from this task (core test, fails the same way on main; likely the temp dir sits inside a git repo).
- G4 (headless Chromium on the built site, port 4297, server killed after): OS via userAgent (mac, windows, linux, iPhone, curl = unknown) gives the right primary card (none for mobile/unknown; mobile shows CLI card first); PowerShell form only on Windows; failures network, 403, 404, no `.vsix` each show the error line with Releases, Marketplace and Open VSX links; hostile `body` (`<img onerror>`) in the mocked release never ran; `sessionStorage` cache hit on reload (1 API call); `sessionStorage` that throws does not break the page; JS off keeps all links (Releases, Marketplace, Open VSX, `vscode:` and npm); copy by keyboard Enter puts the exact command on the clipboard and the live region says "Copied". One real API call: HTTP 200, `v0.5.0`, one asset `gitask-vscode-0.5.0.vsix` on `github.com/vannseavlong/GITASK/releases/download/...`; rate limit is 60/hour per IP unauthenticated (59 left), the cache keeps a visitor to one call per session. No Marketplace click, no download.
- G6 security note: (1) release text (`body`, `name`, notes) is never read; only `tag_name` and asset `name`/`browser_download_url`, rendered as React text or `href`, never `dangerouslySetInnerHTML`. (2) Asset name must match `^[A-Za-z0-9._-]+\.vsix$` and the URL is parsed with `new URL`: origin exactly `https://github.com`, path under `/vannseavlong/GITASK/releases/download/` ending in `/<asset name>`, no `..`, `%`, `?`, `#`, userinfo, quotes, spaces or angle brackets, so a bad release cannot give a `javascript:` link or put shell text in the copyable command (tested). Tag is shown only if it matches a plain version pattern. (3) `sessionStorage` content is re-validated with the same checks; storage errors are swallowed. (4) No token, no cookies, no secrets: unauthenticated GET to api.github.com only (no CSP `connect-src` set in the site today; if one is added it must allow `https://api.github.com`). (5) `vscode:extension/<id>` link is a fixed constant. (6) Residual: GitHub rate limit or an attacker who controls the repo could still publish a malicious `.vsix` under the same name; that is a repo-trust issue, not page code.
- G7 docs sync: release asset naming fact lives in `Docs/architecture/release.md` (updated); `Docs/requirements/landing-page.md` already matches (OS buttons, Install in VS Code, CLI, no hard-coded version, no-JS links); no `Docs/api` entry (public API, per the plan). No docs moved to archive.
- Not verified: Safari/Firefox, real Windows/macOS/screen reader (only accessible names, live region and keyboard path checked in Chromium); G5 review left for a fresh agent; Lighthouse not rerun; `pnpm build` still prints "broken anchor /#download" warnings from docs pages (they come from docs links, not changed here; the id exists in the built HTML).
- Review fixes (2026-11-02): strict URL parsing with tests (`../`, name/url mismatch, host tricks); 8s fetch timeout (injectable, becomes the network failure); `userAgentData.mobile` checked first (Android Desktop site); cache stores `savedAt`, entries over 1h are a miss; duplicate Copy removed, `Shared.tsx` `CopyButton` gained `announce` (live region, clipboard rejection caught, timer cleared on unmount); unused `installCommand` removed from `content.ts`. Re-run: typecheck ok, web tests 23/23, root `pnpm test` 351/352 (only the environmental stray-/tmp/.git test), build ok, Chromium re-check of failure states, cache, copy and no-JS ok; server killed. Extra files touched: `Shared.tsx`, `content.ts`.
