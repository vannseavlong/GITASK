# Release setup guide

Updated: 2026-10-17

One-time setup so that pushing a `vX.Y.Z` tag publishes everything ([how the pipeline works](release.md)). Do the parts in order; each ends with a check.

| You need | For | Secret name |
|---|---|---|
| Security key / passkey on the npm account + trusted publisher | `gitask-cli` on npmjs.com | none (OIDC) |
| Azure DevOps token + Marketplace publisher | extension on VS Code Marketplace | `VSCE_PAT` |
| Open VSX token + namespace | extension on Open VSX (VSCodium, Cursor, Gitpod) | `OVSX_PAT` |

Names to use: npm package `gitask-cli`, publisher/namespace `vannseavlong`, extension id `vannseavlong.gitask-vscode`. The publisher must equal `publisher` in `packages/vscode/package.json`.

---

## 1. GitHub

Repo: `vannseavlong/GITASK`.

1. **Environment.** Settings → Environments → New environment → name it exactly `release`. Under *Required reviewers* add yourself, so every npm/Marketplace publish waits for your click. (Required reviewers on a private repo needs a paid GitHub plan; skip it there and the jobs just run.)
2. **Secrets.** Settings → Secrets and variables → Actions → *New repository secret*. Add `VSCE_PAT` and `OVSX_PAT` once you have them (parts 3 and 4). A missing one skips that store's step. npm needs no secret (part 2).
3. **Workflow permissions.** Settings → Actions → General → Workflow permissions → *Read and write permissions* (the changelog and release jobs push or create a release). Save.
4. **Branch protection (if you enable it on `main`).** The changelog bot pushes to `main`; allow it to bypass, or the changelog job fails.

Check: Actions tab shows `ci` green on the PR.

---

## 2. npmjs.com

Package name `gitask-cli` was free on 2026-10-17. The first publish is manual; every later one is CI with no token.

npm no longer lets you add an authenticator-app (TOTP) code to an account, and tokens that bypass 2FA lose direct publishing in January 2027. So: security key for you, trusted publishing for CI.

1. **Add a security key.** <https://www.npmjs.com/settings/YOUR-USER/tfa> → add a security key or passkey (Touch ID, phone, 1Password, YubiKey). Keep 2FA mode on *Authorization and publishing*. Check: `npm profile get` shows two-factor auth enabled.
2. **Publish `0.1.0` once by hand.** Trusted publishing can only be set on a package that exists.
   ```bash
   npm login
   cd packages/cli
   npm publish --access public      # approve in the browser with your passkey
   ```
   Check: `npm view gitask-cli version`.
3. **Add the trusted publisher.** npmjs.com → package `gitask-cli` → *Settings* → *Trusted Publisher* → GitHub Actions:
   - Organization or user: `vannseavlong`
   - Repository: `GITASK`
   - Workflow filename: `release.yml`
   - Environment: `release`
   - Allowed actions: tick **Allow `npm publish`**. Without it the workflow can only stage a publish, which waits for your 2FA approval and blocks automation. Leave `dist-tag` unticked.

   The values must match exactly (case-sensitive). Also confirm `repository.url` in `packages/cli/package.json` points to this repo (it does).
4. **Optional hardening.** Same page: set publishing access to *Require two-factor authentication and disallow tokens*, so only the trusted workflow can publish.

No token is stored in GitHub. `release.yml` publishes with `npm publish` (npm >= 11.5.1) and `id-token: write`; npm also attaches provenance on a public repo.

Because `0.1.0` is already on npm, the first CI release must be `0.1.1` or higher.

## 3. VS Code Marketplace

> **Needs an Azure subscription (2026).** Azure DevOps will not create the organization without one, so the token cannot be made on a plain Microsoft account. Global PATs also retire on 2026-12-01. If you do not want an Azure account, skip this part and ship to Open VSX (part 4) and the GitHub Release `.vsix` only; the workflow skips the Marketplace step while `VSCE_PAT` is missing.

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

1. Make sure parts 1 and 2 are done (3 and 4 only if you publish the extension; those steps are skipped without their secret).
2. In the PR, run `pnpm bump 0.1.2` (sets both packages to the same version, one line each; do not use `npm version`). Merge to `main`, then `git pull`.
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
| npm `E404` / `ENEEDAUTH` in CI | Trusted publisher missing or does not match repo, workflow filename or environment exactly (part 2, step 3). The job needs `id-token: write`. |
| npm `E403` "two-factor authentication ... is required" (local) | Account has no security key yet (part 2, step 1). |
| npm "Adding a new TOTP 2FA is no longer supported" | Expected. Use a security key / passkey. |
| npm publish from CI is refused or stays "staged" | *Allow `npm publish`* was not ticked on the trusted publisher (part 2, step 3). |
| npm `E422` provenance / repository mismatch in CI | `repository.url` in `packages/cli/package.json` must match the GitHub repo. |
| vsce `401` / `403` | PAT organization not "All accessible organizations", wrong scope, or expired. |
| vsce "publisher not found" | `publisher` in `packages/vscode/package.json` differs from the Marketplace publisher ID. |
| ovsx "not authorized to publish" | Publisher Agreement not signed, or namespace not created. |
| Marketplace/Open VSX step shows as skipped | The matching secret is empty, by design. |
| Tag pushed by mistake | `git push origin :refs/tags/vX.Y.Z && git tag -d vX.Y.Z`. Published npm versions can only be deprecated, not reused. |
