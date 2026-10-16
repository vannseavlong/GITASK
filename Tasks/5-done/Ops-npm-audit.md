# Ops-npm-audit

- **Repo:** GITASK (root)
- **Owner:** SNLRLONG
- **Tier:** T1 · only dependency overrides + docs, no source logic (auto picker)
- **Claimed by:** Claude agent (Sonnet 5.5)
- **Worktree:** `GITASK/GITASK-npm-audit/` · **Branch:** `feat/npm-audit`
- **Started / updated:** 2026-10-17 / 2026-10-17
- **Docs:** `Docs/architecture/release.md` (Dependency audit)
- **Depends on:** none
- **Touches:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `Docs/architecture/release.md`

## Goal
Review the npm audit warnings from install; fix or document each.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (quick)
- Skipped G5, G6, G7, G9, G10: not required for T1.
- [x] G8 commit message  - [ ] G11 changelog (info only: root CHANGELOG.md left to the owner at merge)

## Done when
- [x] npm audit reviewed, result noted

## Notes
- Before: `pnpm audit` and `pnpm audit --prod` both 7 vulnerabilities (2 critical, 2 high, 3 moderate): tinypool x2 (critical), serialize-javascript x2 (high, moderate), braces (high), uuid and postcss-selector-parser (moderate). Almost all via Docusaurus in `packages/web`; braces also via `@vscode/vsce`.
- Fix: `overrides` in `pnpm-workspace.yaml` for serialize-javascript >=7.0.5, uuid >=11.1.1, postcss-selector-parser >=7.1.6, tinypool >=2.1.2 (lockfile regenerated).
- After: 1 vulnerability (high): braces 3.0.3, no patched version on npm (latest is 3.0.3). Build-time only; documented in `Docs/architecture/release.md`.
- Checks: `pnpm install --frozen-lockfile` ok, typecheck ok, test 10/10 pass, build ok, package ok (vsix 9.83 KB), and `pnpm --filter gitask-web run build` still succeeds (run only to verify the overrides; packages/web not edited).
- Note for the web owner: overrides force major bumps on Docusaurus internals (serialize-javascript 6->7, uuid 8->11, tinypool 1->2); the site build passed, but check `docusaurus start` if anything odd shows.
