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
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (deployed URL opened in a browser)
- [ ] G5 code review (strict)  - [ ] G6 security (workflow permissions, secrets, pinned actions)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Owner is logged in with `firebase login`; the agent never creates, pastes or stores credentials and does not run the production deploy
- [ ] `ci.yml` typechecks and builds `packages/web`; CLI and extension jobs stay green
- [ ] `pnpm deploy:web` (prod) typechecks, tests and builds, shows the target project/site and asks for confirmation before deploying; refuses to run from a dirty tree or a branch other than `main` unless forced; firebase-tools pinned to an exact version (no `@latest`)
- [ ] `pnpm deploy:web:preview` deploys to a Hosting preview channel (`staging`, expiry set) and prints its URL; never touches production
- [ ] CI builds `packages/web` on PRs with no secrets and no deploy step
- [ ] `release.yml` is not edited
- [ ] G10 in this file: rollback (`firebase hosting:rollback` or redeploy the previous commit), who watches the first deploy, what happens if hosting is down (extension and CLI still install from their own registries)
- [ ] Cache headers in `firebase.json` verified against the built output paths (Docusaurus hashed assets live in `/assets/`)
- [ ] Live site checked: download buttons resolve to the real latest `.vsix`; sitemap and robots reachable
- [ ] `SITE_URL` in `docusaurus.config.ts` is `https://gitask-me.web.app` (already set); `Docs/architecture/release.md` documents the local deploy and preview flow; root `README.md` links the site; the `seo-checklist` is re-run on the live URL after the owner's first deploy
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
