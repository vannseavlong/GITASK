# GitHub sync

Opt-in, one-way push of tasks to GitHub Issues so that assigning in GITASK notifies the person through GitHub. Code: `packages/core/src/github.ts`. Entry points: `gitask github plan|sync` (CLI) and `GITASK: Sync to GitHub` (VS Code). Docs were read on 2026-10-30; GitHub changes its API, so re-check the linked pages before a release.

## Behaviour
- Off unless `Tasks/gitask.json` has `"github": {"repo": "owner/name", "project": 7}` (`project` optional). Without it no request is ever made.
- `planSync` is a pure dry run (no network, no file access). `applySync` is the only function that sends anything, and only with a token.
- Per task (default: every task outside the done and deploy columns, plus any already linked): create the issue, or update it when the header has `- **Issue:** #123`. Title is the task title; the body (created once, never overwritten) links back to the task file. Assignee is the `Owner`'s `github` name; state is closed in the done and deploy columns. GITASK only ever sets assignees: when the Owner has no GitHub name the issue's assignees are left alone, never cleared (changing the Owner to another person with a GitHub name replaces them).
- Sub-tasks under `## Sub-tasks` become sub-issues, matched by title on later runs (no duplicates). `@person` becomes the sub-issue assignee; a ticked box closes it.
- With `project`, the Project `Status` single-select option whose name matches the column label (case and punctuation ignored) is set; no match is a warning, not an error.
- A person with no valid `github` name is skipped with a warning, never guessed.
- On an update, the issue is read first and only changed fields are sent, so an unchanged task causes no write and no new notification.
- Local files change only after an issue exists. A failure leaves untouched every task whose issue was not created; an issue already created keeps its `Issue:` line so a retry does not duplicate it. `Issue:` lines are committed by pathspec; a file with uncommitted edits is written but not committed.
- Not done: two-way sync, deleting issues, pagination beyond 100 sub-issues, automatic retry after a rate limit.

## In the UI
The **Sync to GitHub** dialog (`packages/ui/src/components/github-dialog.tsx`; screen description in `Docs/requirements/views.md`) asks the host for the dry run with `githubPlan`; the host answers `githubPlanResult` with `toPlanView(plan)` (`packages/vscode/src/github-plan.ts`: titles, actions, GitHub names, warnings; no paths or bodies). The confirm button sends `githubSync` with `confirmRepo` (the repo the user was shown) and `planHash` (the plan's `hash`). The host recomputes the plan itself, refuses when `confirmRepo` is not the repo it would use or the hash differs from the recomputed plan (`confirmProblem`, before any token is requested), and otherwise applies it. When the plan has a `repoMismatch` the dialog shows a red warning and keeps Confirm disabled until the user ticks a checkbox naming the target repo:
- VS Code (`syncFromDialog`): token from the `vscode.authentication` session; no second modal because the dialog is the confirmation. The command `GITASK: Sync to GitHub` has no dialog, so on a mismatch it shows a second, separate modal.
- `gitask serve` (`handler.ts`): token only from `GITHUB_TOKEN` in the server process environment, never from the browser. Without it the dialog shows how to set it and nothing is sent.
- Replies hold counts and warnings only; errors pass through `GithubError` messages, which never contain the token, and the serve handler scrubs the token from any other error text.
- Not verified: that GitHub actually notifies the assignees (needs the manual throwaway-repo proof).

## Endpoints used
Base `https://api.github.com`, headers `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`.

| Call | Docs |
|---|---|
| `POST /repos/{o}/{r}/issues`, `GET` and `PATCH /repos/{o}/{r}/issues/{n}` | [Issues](https://docs.github.com/en/rest/issues/issues) |
| `GET` and `POST /repos/{o}/{r}/issues/{n}/sub_issues` (body `sub_issue_id` is the child's `id`, not its number) | [Sub-issues](https://docs.github.com/en/rest/issues/sub-issues) |
| `GET /orgs/{o}/projectsV2/{p}/fields` (fallback `/users/{o}/...`) | [Project fields](https://docs.github.com/en/rest/projects/fields) |
| `POST /orgs/{o}/projectsV2/{p}/items` (`type: Issue`, `owner`, `repo`, `number`), `PATCH .../items/{id}` (`fields: [{id, value: optionId}]`) | [Project items](https://docs.github.com/en/rest/projects/items) |

## Token permissions
Fine-grained token, per [permissions required](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens):
- Issues and sub-issues: repository permission **Issues: write** (read for listing sub-issues). Confirmed.
- Projects v2 items and fields: **organization** permission **Projects: write** (read for fields); the REST endpoints are listed under `/orgs/{org}/projectsV2/...` for fine-grained tokens. Confirmed.
- Setting assignees needs push access to the repo; without it GitHub silently drops them ([Issues](https://docs.github.com/en/rest/issues/issues)).

The extension always asks for `repo`: whether the target repo is public cannot be known without an unauthenticated request to GitHub, and none is sent before the user confirms, so the scope is not narrowed to `public_repo` automatically. A user who syncs only a public repo can use `GITHUB_TOKEN` in the CLI with a `public_repo` classic token or a fine-grained token limited to that repo.

Classic token / OAuth ([scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)): `repo` (private repos; `public_repo` for public) and `project` (read/write user and organization projects; `read:project` is read only). VS Code's built-in GitHub sign-in uses OAuth scopes, so the extension asks for `repo`, plus `project` when the config has a project.

**Not confirmed from the docs:**
- Whether a classic `repo` scope is documented as the exact requirement for the Issues endpoints (the Issues page only talks about roles); `repo` is the long-standing convention.
- User-owned Projects v2 with a fine-grained token: the permissions page lists only `/orgs/` project endpoints and no user-level Projects permission. Use a classic token with `project` for a user-owned project, or an organization project. Untested.
- GitHub App installation tokens: not checked; the code sends a plain bearer token and would need the equivalent Issues and Projects permissions.
- Whether adding an issue already in the Project is idempotent over REST (the second sync calls add-item again).
- Whether an invalid assignee login returns 422 or is dropped.
- That GitHub notifies the assignee (standard GitHub behaviour, not verified in the docs). The task requires a manual proof on a throwaway repo; see the task file.

## Rate limits
[Primary](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api): 5,000 requests/hour for a user token. Secondary: content creation about 80 per minute and 500 per hour (creating issues triggers notifications), 100 concurrent requests. A limit gives 403 or 429 with `x-ratelimit-remaining: 0`, `retry-after` or a message naming the limit. The client sends requests one at a time, reports the wait ("resets at ..." or "wait N s") and stops; it does not retry. A first sync of a large board can reach the content-creation limit; sync a few tasks at a time (`gitask github sync --yes <task>`).

## Security model
- Token sources: VS Code GitHub session (`vscode.authentication.getSession('github', scopes, {createIfNone: true})`, requested only after the user confirms the dry run) or `GITHUB_TOKEN` in the CLI. Never read from `gitask.json` or any repo file.
- The token is used only in the `Authorization` header, sent only to the base URL (default `api.github.com`; redirects are refused). It is not logged, stored, written to a task file or git, or sent to the UI. Error messages are built from the status and GitHub's message with the token scrubbed; network errors are replaced by a fixed message.
- The repo name is validated (`owner/name`; owner `[A-Za-z0-9-]` up to 39, name `[A-Za-z0-9_.-]` up to 100, no `.`/`..` name, no `.git` suffix, so a URL can never be normalised to another path), logins are validated, and paths are URL-encoded.
- **The target repo comes from `Tasks/gitask.json`, which anyone who can change the repo can edit** (a pull request could point it at a public repo the maintainer's token can write to). `planSync` is given the `origin` remote (`readOriginRepo`: `git remote get-url origin`, read-only, github.com only) and, when `github.repo` differs or there is no GitHub origin, the plan carries `repoMismatch`. `applySync` then throws unless `allowRepo` equals `plan.repo`. CLI: `gitask github sync --yes --allow-repo owner/name` (the plan prints a `WARNING` first). UI: red warning plus a tick box. VS Code command: second modal. The plan `hash` (SHA-256 of the plan) ties the user's confirmation to what was shown. A repo that matches origin needs no extra step.
- Consent: nothing is sent without an explicit step. UI dialog: preview first, then a confirm button. CLI `plan` is the default and `sync` needs `--yes`; VS Code shows a modal listing issues to create or update and who may be notified.
