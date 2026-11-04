# Ops-web-home-a11y

- **ID:** T-0061
- **Repo:** GITASK
- **Owner:** Owner
- **Tier:** T1 · one component, no logic (auto picker, see `PIPELINE.md`)
- **Claimed by:** none
- **Worktree:** `.claude/worktrees/agent-ae7961f32a796f244` · **Branch:** `fix/web-home-a11y`
- **Started / updated:** 2026-11-02 / 2026-11-05
- **Due:** <YYYY-MM-DD, optional>
- **Docs:** `Tasks/_plans/Ops-web-polish-and-readme.md`
- **Depends on:** none
- **Touches:** `packages/web/src/landing/components/WhatsNew.tsx` (the CLI table lives here, not in CommandLine.tsx), `packages/web/src/landing/landing.css` (`.cli-list`/`.cli-row` region only)

## Goal
Fix the Lighthouse `aria-required-children` failure on the home page (CLI table markup with `role="table"`/`role="row"`), taking Accessibility from 95 to 100. Found by the `Ops-web-seo` run.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [x] G1 scope  - [x] G2 static (tsc)  - [x] G3 tests (23 pass)  - [ ] G4 run it (built site checked: no role=table/row/cell left, list renders; Lighthouse and visual check NOT run)
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Lighthouse mobile on `/`: Accessibility 100, no `aria-required-children` failure
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge

Note: fix replaces the ARIA table with `<ul class="cli-list">` / `<li class="cli-row">` in `WhatsNew.tsx`. Lighthouse not run (could not fetch it offline). `pnpm build` warns about broken `/#download` anchors from docs pages; not from this change (Download is another task's area).
