# CLI-npx-run

- **ID:** T-0050
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T2 · package bin and docs; touches publish metadata (auto picker, see `PIPELINE.md`)
- **Claimed by:** claude session (agent), 2026-10-30
- **Worktree:** `GITASK/GITASK-npx-run/` · **Branch:** `feat/npx-run`
- **Started / updated:** 2026-10-30 / 2026-10-30
- **Docs:** `Tasks/_plans/Ext-polish-0-5-0.md`
- **Depends on:** none (0.5.0 is merged on main)
- **Touches:** packages/cli/package.json (bin, files), root package.json scripts, packages/cli/README.md, root README, packages/web/docs

## Goal
Run the browser UI with the package managers people use, not `node packages/cli/dist/gitask.js`: `npx gitask-cli serve`, `pnpm dlx gitask-cli serve`, `yarn dlx gitask-cli serve`, `bunx gitask-cli serve`, and in this repo `pnpm gitask serve`.

## Gates (T2)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests (new)  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security (only if input or auth handling changes)  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review (optional)  - [ ] G11 changelog

## Done when
- [ ] `bin` makes `gitask` and `gitask-cli` both work; `npm pack` the CLI to a temp dir and run it with `npx --yes ./tarball serve --port 0` (and `pnpm dlx`/`bunx`/`yarn dlx` when those tools are installed: state which were NOT available); the tarball contains the bundled UI and nothing secret
- [ ] Root scripts: `pnpm gitask <args>` (runs the built CLI, builds first if dist is missing) and `pnpm serve`
- [ ] `gitask serve` with no `--dir` finds `Tasks/` by walking up to the git root, and says clearly when it finds none
- [ ] README and website docs show the four runners and the global install (`npm i -g gitask-cli`)
- [ ] `engines` of the published CLI stay accurate for the bundle
- [ ] Root `CHANGELOG.md` entry added
- [ ] Worktree and branch removed after merge
