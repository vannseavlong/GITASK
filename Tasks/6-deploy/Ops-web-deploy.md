# Ops-web-deploy

- **ID:** T-0006
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · deploy script, hosting release, public site (re-scoped 2026-11-02: local deploy, no CI deploy, so no deploy secret)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-deploy/` · **Branch:** `feat/web-deploy`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-12
- **Docs:** `Docs/architecture/release.md`, `Tasks/_plans/Ops-landing-page.md`; pattern to follow: `SheetDB/sheet-db-landing/CI-CD-SETUP.md` and `FIREBASE_DEPLOYMENT.md`
- **Depends on:** Ops-web-downloads, Ops-web-docs, Ops-web-seo (all merged); owner runs `firebase login` locally
- **Touches:** `packages/web/package.json` (deploy scripts only), `scripts/deploy-web.sh` (new, if a script file is clearer than package scripts), `packages/web/firebase.json`, `packages/web/.firebaserc`, `.github/workflows/ci.yml` (typecheck + build `packages/web` on PRs, no secrets), `Docs/architecture/release.md` (add a "Website" section), root `README.md` (site link)

## Goal
Deploy the site to Firebase Hosting (`gitask-me.web.app`, project `longcelot-eco-system`) **from the owner's machine with one script**, with an optional preview (staging) channel. CI only typechecks and builds the web package on PRs; it never deploys and holds no Firebase secret. Release stays tag-driven and unchanged; the site reads the latest release at runtime.

## Gates (T3)
- [x] G1 scope  - [x] G2 static  - [x] G3 tests  - [x] G4 run it (local build + guards + DRY_RUN; deployed URL check is the owner's, see G10)
- [x] G5 code review (strict; fresh reviewer: findings 1,2,3,5,6 fixed, 4,7,8 informational)  - [x] G6 security (workflow permissions, secrets, pinned actions)  - [x] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan (drafted below; executed after owner's first deploy)  - [x] G11 changelog

## Done when
- [ ] Owner is logged in with `firebase login`; the agent never creates, pastes or stores credentials and does not run the production deploy
- [x] `ci.yml` typechecks and builds `packages/web`; CLI and extension jobs stay green
- [x] `pnpm deploy:web` (prod) typechecks, tests and builds, shows the target project/site and asks for confirmation before deploying; refuses to run from a dirty tree or a branch other than `main` unless forced; firebase-tools pinned to an exact version (no `@latest`)
- [x] `pnpm deploy:web:preview` deploys to a Hosting preview channel (`staging`, expiry set) and prints its URL; never touches production
- [x] CI builds `packages/web` on PRs with no secrets and no deploy step
- [x] `release.yml` is not edited
- [ ] G10 in this file: rollback (`firebase hosting:rollback` or redeploy the previous commit), who watches the first deploy, what happens if hosting is down (extension and CLI still install from their own registries)
- [x] Cache headers in `firebase.json` verified against the built output paths (Docusaurus hashed assets live in `/assets/`)
- [ ] Live site checked: download buttons resolve to the real latest `.vsix`; sitemap and robots reachable
- [ ] `SITE_URL` in `docusaurus.config.ts` is `https://gitask-me.web.app` (already set); `Docs/architecture/release.md` documents the local deploy and preview flow; root `README.md` links the site; the `seo-checklist` is re-run on the live URL after the owner's first deploy
- [x] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge

## G10 release plan
- **Who/when:** the owner deploys, from `main` after this PR merges. Agents never run `firebase login`, deploy or hold credentials.
- **First deploy:** `npx --yes firebase-tools@15.34.0 login`, then `pnpm deploy:web:preview` and open the URL, then `pnpm deploy:web` from `main` (type `deploy gitask-me`). Owner watches it finish, then checks: home, `/docs/faq` on refresh, search, Download buttons resolve to the real `.vsix`, `/sitemap.xml`, `/robots.txt`, OG preview; re-run `seo-checklist`.
- **Rollback:** `firebase hosting:rollback` does not exist in firebase-tools 15 (the task text assumed it). Use Console > Hosting > Release history > Rollback, or `hosting:clone gitask-me@<versionId> gitask-me:live`, or redeploy the previous good commit. The site is static, so rollback is instant and loses no data.
- **Flags/deps:** none. No secret, no CI deploy, no change to `release.yml`; the release tag flow is unchanged. firebase-tools pinned at 15.34.0 (released 2026-10-14; 15.34.1 was too new).
- **If hosting is down:** only the website; extension, CLI and `.vsix` install from Marketplace/Open VSX/npm/GitHub. Wait for recovery or roll back.

## Notes
- Root `package.json` (not in `Touches`) had to change: `pnpm deploy:web` / `deploy:web:preview` live there; `deploy:pro` kept as an alias of `deploy:web`. The unpinned `deploy` script in `packages/web/package.json` was removed (it used `@latest`).
- `firebase.json` headers were already correct: the build puts only hashed `.js`/`.css` in `/assets/`, images are in `/img/`. `.firebaserc` and `firebase.json` unchanged.
- Guards verified: wrong branch refuses (on `feat/web-deploy`), dirty tree refuses (in a scratch clone on `main`), bad args refuse; all before any firebase call. `DRY_RUN=1` prints the commands. shellcheck not installed (only `bash -n`). `ci.yml` uses `@v4` tags like the existing jobs (not SHA-pinned; consistent, not hardened); the `web` job has `contents: read` only. Fresh-reviewer fixes: prod must be on main and equal to freshly fetched `origin/main` (offline fetch refuses, even in DRY_RUN); `--allow-unclean` skips only the clean-tree check; confirmation needs a TTY (piped stdin refused); paths passed to `node -p` via argv; `DRY_RUN` accepts only empty or `1`. Re-tested all guards in scratch clones.
- `pnpm --filter gitask-web build` succeeds but reports pre-existing "broken anchor `/#download`" warnings on docs pages (not touched here).
- Not verified: real deploy/preview/login, `hosting:clone` rollback on a live site, CI run on GitHub, live-site checks.

## Live check (2026-11-02, after the owner's first production deploy)
- `https://gitask-me.web.app` returns 200; `/docs/faq` 200; unknown path returns 404 with the 404 page; `og.png` 200 (61 KB, image/png); `robots.txt` allows all and names the sitemap; sitemap lists the home page and the docs pages.
- Home head: unique title, description, canonical, `og:*` with 1200x630 image, `twitter:card=summary_large_image`, `theme-color`, favicon, manifest, one `h1`, `SoftwareApplication` JSON-LD with price 0 and no version.
- Hashed `/assets/` files: `max-age=31536000, immutable`. Images: `max-age=86400`.
- **Finding:** HTML pages (`/`, `/docs/*`) are served with `max-age=3600`, not `must-revalidate`. The `**/*.@(html)` header rule does not match clean URLs. After a deploy, a visitor can get 1 hour old HTML that points at hashed assets Firebase has already replaced. Follow-up: `Ops-web-cache-headers`.
- **Findings, not fixed:** `gitask-me.firebaseapp.com` serves the site too (canonical covers it, no redirect); `/search` is listed in the sitemap; `http://` redirects (301) to https. Lighthouse not re-run on the live URL; JSON-LD not yet put through a validator.

