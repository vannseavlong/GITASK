# Ops-web-deploy

- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · deploy files (`.github/workflows`), hosting release, public site
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-web-deploy/` · **Branch:** `feat/web-deploy`
- **Started / updated:** none / 2026-10-17
- **Docs:** `Docs/architecture/release.md`, `Tasks/_plans/Ops-landing-page.md`; pattern to follow: `SheetDB/sheet-db-landing/CI-CD-SETUP.md` and `FIREBASE_DEPLOYMENT.md`
- **Depends on:** Ops-web-downloads, Ops-web-docs, Ops-web-seo, Ops-github-remote (repo pushed), owner creates the Firebase site and secrets
- **Touches:** `.github/workflows/ci.yml`, `.github/workflows/web.yml` (new), `packages/web/firebase.json`, `packages/web/.firebaserc`, `Docs/architecture/release.md` (add a "Website" section)

## Goal
Build the site in CI on every PR and deploy to Firebase Hosting on merge to `main`. Release stays tag-driven and unchanged; the site reads the latest release at runtime.

## Gates (T3)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it (deployed URL opened in a browser)
- [ ] G5 code review (strict)  - [ ] G6 security (workflow permissions, secrets, pinned actions)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Owner has created the Firebase project/site and added the secret(s); the agent does not create or paste credentials
- [ ] `ci.yml` typechecks and builds `packages/web`; CLI and extension jobs stay green
- [ ] Deploy runs only on `main` with least-privilege `permissions`; PRs build, never deploy (a preview channel is optional)
- [ ] `release.yml` is not edited
- [ ] G10 in this file: rollback (redeploy the previous commit or `firebase hosting:rollback`), who watches the first deploy, what happens if hosting is down (extension and CLI still install from their own registries)
- [ ] Cache headers: long for hashed assets, short for HTML, as in the LSDB `firebase.json`
- [ ] Live site checked: download buttons resolve to the real latest `.vsix`; sitemap and robots reachable
- [ ] Production URL set in the config used by `Ops-web-seo`; `Docs/architecture/release.md` documents the site deploy; root `README.md` links the site
- [ ] Root `CHANGELOG.md` entry `[Ops]` added
- [ ] Worktree and branch removed after merge
