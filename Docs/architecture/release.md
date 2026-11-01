# Release

Updated: 2026-10-17

Tag-driven. `release.yml` runs on `git push origin vX.Y.Z`.

```
tag vX.Y.Z → verify (tag == package versions, typecheck, test)
           ├─ npm        → gitask-cli          (trusted publishing, no token)
           └─ extension  → VS Code Marketplace (VSCE_PAT)
                         → Open VSX            (OVSX_PAT)
                         → GitHub Release with the .vsix
```

- One version for both packages. `pnpm bump X.Y.Z` sets both (`scripts/bump.mjs`); commit it in the PR, merge, pull `main`, then tag the merged commit. Never use `npm version`: it tags immediately and reformats `package.json`. `scripts/check-release.mjs` fails the run if they differ from the tag.
- `vX.Y.Z-beta.1` publishes to the npm `next` tag and the Marketplace/Open VSX pre-release channel.
- A marketplace step is skipped (not failed) while its secret is missing.
- Jobs `npm` and `extension` use the GitHub environment `release`; add required reviewers there to get a manual approval before anything goes live.
- The website's Download section reads `releases/latest` from the GitHub API at page load and picks the asset ending in `.vsix` (the name carries the version, so nothing is hard-coded). Keep exactly one `.vsix` on each release and the repo public; see `packages/web/src/lib/release.ts`.
- `gitask-core` is bundled into both outputs by esbuild and is never published.

## Release workflow (every change, every release)

Day to day, nothing publishes: only a pushed tag does.

1. **Work in the task's worktree** on its own branch (`feat/<name>`), per `Tasks/README.md`.
2. **Commit and open a PR to `main`.** `ci.yml` runs typecheck, tests and `pnpm package`. Merge only when it is green.
3. **If the PR is a release,** run `pnpm bump X.Y.Z` in the PR. It sets `packages/cli` and `packages/vscode` to the same version (one line each). Do not use `npm version`.
4. **After the merge,** update local `main`: `git checkout main && git pull origin main`.
5. **Check before tagging:** `git log -1 --oneline` is the merge you expect, and `node scripts/check-release.mjs vX.Y.Z` prints `stable` (or `prerelease`).
6. **Tag the merged commit and push only the tag:**
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
7. **Approve** the `release` environment in Actions, then **check**: `npm view gitask-cli version`, the GitHub Release has `gitask-vscode-X.Y.Z.vsix`, and the Marketplace / Open VSX pages show the version (a new version can take a few minutes to verify).
8. **Close out the task:** `CHANGELOG.md` entry, task file to `5-done/`, remove the worktree and branch.

Rules:
- Not every merge is a release. No tag, no publish.
- Never tag before the version bump is on `main`; the tag must point at a commit where every package has that version.
- A published version is final (npm never reuses one). Fix forward with the next number. A tag whose run failed before publishing can be deleted and re-pushed: `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`.
- Agents prepare the PR and the bump; the human commits, merges, tags and approves.

## Website

`packages/web` (Docusaurus) is hosted on Firebase Hosting: site `gitask-me` (`https://gitask-me.web.app`) in project `longcelot-eco-system`. It is deployed **from the owner's machine**, never from CI. CI (`ci.yml`, job `web`) only typechecks and builds it on PRs, with read-only permissions and no secrets. The website does not take part in the tag release; the Download section reads the latest release at runtime.

The target comes from `packages/web/.firebaserc` and `packages/web/firebase.json`. `firebase-tools` is pinned in `scripts/deploy-web.sh` (`FIREBASE_TOOLS_VERSION`, never `@latest`); bump it on purpose, using a release at least two weeks old.

**Deploy (live), from an up-to-date `main`:**
```bash
pnpm deploy:web            # alias: pnpm deploy:pro
```
It refuses unless you are on `main`, `HEAD` equals a freshly fetched `origin/main` (an offline fetch also refuses, even with `DRY_RUN=1`) and the tree is clean. `--allow-unclean` skips only the clean-tree check, never the branch or up-to-date check. It then runs typecheck, tests and build, prints the project and site, and deploys only after you type `deploy gitask-me` in an interactive terminal (piped input is refused).

**Preview (staging channel), any branch:**
```bash
pnpm deploy:web:preview    # PREVIEW_EXPIRES=3d to change the 7d default
```
Typechecks, builds and runs `hosting:channel:deploy staging --expires 7d`; firebase prints the preview URL. The live channel is never touched. Re-running replaces the same `staging` channel.

`DRY_RUN=1 pnpm deploy:web` (only empty or `1` accepted) runs the guards and prints each command without building or contacting Firebase.

**Cache headers** (`firebase.json`): HTML `max-age=0, must-revalidate` (Firebase matches the request path, so clean URLs need explicit rules for `/`, `/docs/**` and `/search`; add the path when a new top-level page is added); `/assets/**` (Docusaurus hashed JS/CSS) one year, immutable; images and fonts one day. Checked against a real `pnpm --filter gitask-web build`: only hashed `.js`/`.css` live in `/assets/`, images are in `/img/`.

**Rollback.** `firebase hosting:rollback` does not exist in firebase-tools 15. Use one of:
- Console: Firebase Console > Hosting > `gitask-me` > Release history > the previous release > Rollback.
- CLI: `npx firebase-tools@<pinned> hosting:clone gitask-me@<versionId> gitask-me:live --project longcelot-eco-system` (version ids are in the Release history).
- Or check out the previous good commit on `main` and run `pnpm deploy:web` again.

**First-deploy checklist (owner, once):**
1. `npx firebase-tools@<pinned> login`, and confirm access: `... hosting:sites:list --project longcelot-eco-system` shows `gitask-me`.
2. `pnpm deploy:web:preview`; open the printed URL: home, a docs page, search, dark/light toggle, download buttons.
3. From `main`, `pnpm deploy:web`; watch it finish.
4. On `https://gitask-me.web.app`: Download buttons resolve to the real latest `.vsix`, `/sitemap.xml` and `/robots.txt` load, a deep link such as `/docs/faq` loads on refresh, the OG image shows in a link preview.
5. Re-run the `seo-checklist` on the live URL.

**If hosting is down:** only the website is affected. The extension (Marketplace, Open VSX), the CLI (npm) and the `.vsix` (GitHub Releases) install from their own registries, and docs are also readable in the repo under `packages/web/docs`. Check status.firebase.google.com, then redeploy or roll back when it recovers; nothing else needs action.

## One-time setup (owner)
Tokens, publisher, namespace and the `release` environment: [setupguide.md](setupguide.md).

## Develop
pnpm 11 (pinned by `packageManager`), Node 24. `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm package`.

## Dependency audit
Check with `pnpm audit` (also `--prod`; in this monorepo it still reports `packages/web`, which is built, not published). Fixes for transitive packages live as `overrides` in `pnpm-workspace.yaml`; drop an override once the parent package requires a patched version itself.

Open advisory (reviewed 2026-10-17):
- `braces` 3.0.3, high, GHSA-vfj7-8cjw-p6xm (ReDoS on huge brace patterns). The advisory lists `>=3.0.4` as patched but no such version is on npm (latest is 3.0.3), so it cannot be overridden. It comes only from build-time tools (`@vscode/vsce` via secretlint, and Docusaurus in `packages/web`) that run on our own files; nothing ships in the `.vsix` or the `gitask-cli` bundle. Accepted; re-check when `pnpm audit` shows a patched release.
