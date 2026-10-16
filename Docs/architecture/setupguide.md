# Release setup guide

Updated: 2026-10-17

One-time setup so that pushing a `vX.Y.Z` tag publishes everything ([how the pipeline works](release.md)). Do the parts in order; each ends with a check.

| You need | For | Secret name |
|---|---|---|
| npm access token | `gitask-cli` on npmjs.com | `NPM_TOKEN` |
| Azure DevOps token + Marketplace publisher | extension on VS Code Marketplace | `VSCE_PAT` |
| Open VSX token + namespace | extension on Open VSX (VSCodium, Cursor, Gitpod) | `OVSX_PAT` |

Names to use: npm package `gitask-cli`, publisher/namespace `vannseavlong`, extension id `vannseavlong.gitask-vscode`. The publisher must equal `publisher` in `packages/vscode/package.json`.

---

## 1. GitHub

Repo: `vannseavlong/GITASK`.

1. **Environment.** Settings → Environments → New environment → name it exactly `release`. Under *Required reviewers* add yourself, so every npm/Marketplace publish waits for your click. (Required reviewers on a private repo needs a paid GitHub plan; skip it there and the jobs just run.)
2. **Secrets.** Settings → Secrets and variables → Actions → *New repository secret*. Add `NPM_TOKEN`, `VSCE_PAT`, `OVSX_PAT` once you have them (parts 2 to 4). A missing `VSCE_PAT` or `OVSX_PAT` skips that step; a missing `NPM_TOKEN` fails the npm job.
3. **Workflow permissions.** Settings → Actions → General → Workflow permissions → *Read and write permissions* (the changelog and release jobs push or create a release). Save.
4. **Branch protection (if you enable it on `main`).** The changelog bot pushes to `main`; allow it to bypass, or the changelog job fails.

Check: Actions tab shows `ci` green on the PR.

---

## 2. npmjs.com

You already have an account. Package name `gitask-cli` was free on 2026-10-17.

1. **Turn on 2FA** for the account (Account → Two-Factor Authentication) if it is not already; npm requires it to publish.
2. **First publish, by hand (recommended).** A token can only be limited to a package that already exists, so claim the name once yourself, then lock the token down:
   ```bash
   pnpm install && pnpm --filter gitask-cli run build
   cd packages/cli
   npm login
   npm publish --access public      # prompts for your OTP
   ```
   If you do this, bump nothing: CI later publishes the *next* version, so tag `v0.1.1` (or higher) for your first CI release, with both package versions bumped to match. Skip this step if you would rather let the first tag publish it; then use an "All packages" token in step 3 and narrow it afterwards.
3. **Create the token.** npmjs.com → profile picture → *Access Tokens* → *Generate New Token* → *Granular Access Token*.
   - Name: `gitask-github-actions`
   - Expiration: the longest allowed (npm caps write tokens at 90 days; set a reminder to rotate it)
   - Packages and scopes: *Read and write*, select `gitask-cli`
   - Tick *Bypass two-factor authentication* (CI cannot type an OTP)
4. Copy the token (shown once) → GitHub secret `NPM_TOKEN`.

Check: after a release, `npm view gitask-cli version` shows the new version.

**Optional, better later: trusted publishing.** On the package's npmjs.com *Settings → Trusted Publisher*, add GitHub Actions with repo `vannseavlong/GITASK`, workflow `release.yml`, environment `release`. Then the token and its 90-day rotation go away, but `release.yml` must be changed to publish with OIDC (needs `id-token: write` and a recent npm CLI). Not done yet; ask for it when you want it.

---

## 3. VS Code Marketplace

Two accounts are involved: a Microsoft account for the publisher, and an Azure DevOps organization for the token.

1. **Azure DevOps organization.** Sign in at <https://dev.azure.com> with your Microsoft account and create an organization if you have none (any name).
2. **Publisher.** Go to <https://marketplace.visualstudio.com/manage/createpublisher>, sign in with the same account, and create a publisher:
   - **ID:** `vannseavlong` (permanent, cannot be changed; it becomes part of `vannseavlong.gitask-vscode`)
   - Name: any display name
3. **Personal Access Token.** In Azure DevOps: top right user-settings icon → *Personal access tokens* → *New Token*.
   - Name: `gitask-vsce`
   - Organization: **All accessible organizations** (required, or publishing fails with 401/403)
   - Expiration: up to 1 year (set a reminder)
   - Scopes: *Custom defined* → *Show all scopes* → **Marketplace** → tick **Manage**
4. Copy the token (shown once) → GitHub secret `VSCE_PAT`.
5. **Test locally once (optional but quick):**
   ```bash
   cd packages/vscode
   pnpm exec vsce verify-pat vannseavlong     # paste the token
   ```
   It should say the PAT is valid for the publisher.

Before the first publish the listing needs: an `icon` (128×128 PNG) in `packages/vscode/package.json`, and a README with a screenshot or GIF. Both are still open in `Tasks/3-in-progress/Ops-publish-prep.md`.

Check: <https://marketplace.visualstudio.com/items?itemName=vannseavlong.gitask-vscode> loads (a new version can take a few minutes to pass verification).

---

## 4. Open VSX (optional, reaches VSCodium and Cursor)

1. Sign in at <https://open-vsx.org> with GitHub.
2. Open your profile → *Log in with Eclipse* and link an Eclipse Foundation account (free, <https://accounts.eclipse.org>), then sign the **Publisher Agreement**. Publishing is blocked until this is done.
3. *Settings → Access Tokens* → *Generate New Token* → copy it → GitHub secret `OVSX_PAT`.
4. Create the namespace once:
   ```bash
   pnpm dlx ovsx create-namespace vannseavlong -p <token>
   ```

Check: <https://open-vsx.org/extension/vannseavlong/gitask-vscode> loads after the first release.

---

## 5. First release

1. Make sure parts 1 to 4 are done (at least 1 and 2 for an npm-only release).
2. Bump `version` in **both** `packages/cli/package.json` and `packages/vscode/package.json` to the same number (e.g. `0.1.1`). Commit and merge to `main`.
3. Tag and push:
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```
4. Watch Actions → `release`. Approve the `release` environment when asked.

Pre-release: tag `v0.2.0-beta.1` (versions set to `0.2.0-beta.1`). It goes to the npm `next` tag and the pre-release channel on the stores, not to `latest`.

## If something fails

| Symptom | Cause / fix |
|---|---|
| `check-release` says "package.json is X, tag is Y" | Versions in the two package.json files do not match the tag. Fix, move the tag. |
| npm `E403 ... cannot publish over the previously published version` | That version is already on npm. Bump and tag again. |
| npm `E404` on publish, or `ENEEDAUTH` | Token missing, expired, or scoped to a package that did not exist yet. Re-create it (part 2). |
| npm `EOTP` | Token lacks *Bypass two-factor authentication*. |
| vsce `401` / `403` | PAT organization not "All accessible organizations", wrong scope, or expired. |
| vsce "publisher not found" | `publisher` in `packages/vscode/package.json` differs from the Marketplace publisher ID. |
| ovsx "not authorized to publish" | Publisher Agreement not signed, or namespace not created. |
| Marketplace/Open VSX step shows as skipped | The matching secret is empty, by design. |
| Tag pushed by mistake | `git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z`. Published npm versions can only be deprecated, not reused. |
