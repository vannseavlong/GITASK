# Ops-web-cache-headers

- **ID:** T-0063
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T3 · hosting config (`firebase.json`) is a deploy file and changes what the public site serves (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session, 2026-11-02
- **Worktree:** `GITASK/GITASK-web-cache-headers/` · **Branch:** `fix/web-cache-headers`
- **Started / updated:** 2026-11-02 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Tasks/6-deploy/Ops-web-deploy.md` (Live check), `Docs/architecture/release.md` (Website)
- **Depends on:** none (site is live)
- **Touches:** `packages/web/firebase.json`, `Docs/architecture/release.md` (one line)

## Goal
Serve HTML with `max-age=0, must-revalidate`. Live check showed `/` and `/docs/*` at `max-age=3600`, because the `**/*.@(html)` header rule does not match clean URLs; after a deploy a visitor can get HTML that points at hashed assets Firebase has already replaced.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static (JSON valid, build passes)  - [x] G3 tests (Skipped G3: config only)  - [x] G4 run it (Firebase hosting emulator, no login: `/`, `/docs/faq`, `/search` max-age=0 must-revalidate; assets immutable; images 86400)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [x] Header source patterns cover `/`, `/docs/**`, `/search` and `/404.html` with `Cache-Control: public, max-age=0, must-revalidate`; hashed `/assets/**` and images unchanged
- [x] Verified with the Firebase hosting emulator (no login) or on the `staging` preview channel: `curl -sI` shows the header on `/` and `/docs/faq`
- [ ] After the owner deploys: the same `curl -sI` on the live site
- [x] Note in `release.md`: a new top-level page needs its path added to the header rules
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
