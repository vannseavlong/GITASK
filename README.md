# GITASK

**Git + Task.** A Kanban board for a plain-Markdown `Tasks/` folder. One file per task, the folder is the status. Drag a card in VS Code and GITASK runs `git mv`, bumps the task's `Started / updated` date and commits that one file. No accounts: git is the identity and the history.

Built for workspaces installed from [My-Agent-SetUp](https://github.com/vannseavlong/Agent-SetUp), so humans and coding agents share one board.

## Packages

| Package | What |
|---|---|
| `packages/core` | Parse tasks, build the board, move/create tasks, changelog entries. No VS Code dependency. |
| `packages/cli` | `gitask board \| move \| new \| changelog \| people \| assign \| subtask \| report \| github \| serve` |
| `packages/ui` | The React + shadcn UI, shared by VS Code and `gitask serve` |
| `packages/vscode` | The VS Code extension (loads the UI in a webview) |
| `packages/web` | The website and user docs |

## Task format

```
Tasks/
  1-backlog/ 2-todo/ 3-in-progress/ 4-testing/ 5-done/ 6-deploy/   ← columns (any numbered folders)
  _inbox/ _plans/ _TEMPLATE.md                                      ← ignored by the board
```

```markdown
# Web-login-page

- **Owner:** Sam
- **Tier:** T2 · new screen
- **Claimed by:** none
- **Started / updated:** 2026-10-01 / 2026-10-17
```

The H1 is the title; `- **Key:** value` lines above the first `##` are the fields.

## New in 0.5.0

- **People:** assign a task to a repo contributor (from git history, never emails). [Docs](https://github.com/vannseavlong/GITASK/blob/main/packages/web/docs/people-and-subtasks.md)
- **Sub-tasks:** Jira-style, with `@person #lane` on each checkbox line under `## Sub-tasks`.
- **Report:** what was done, by person, as HTML, Markdown or CSV (`gitask report`, or Export in the UI). [Docs](https://github.com/vannseavlong/GITASK/blob/main/packages/web/docs/report.md)
- **`gitask serve`:** the same UI in a browser, local and token-protected. Security model: `Docs/architecture/serve.md`.
- **GitHub sync:** opt-in, dry run first, one-way to Issues. `Docs/architecture/github.md`.
- **New UI:** React + shadcn, see `Docs/architecture/ui.md`.

![GITASK board with assignees and sub-tasks](packages/web/static/img/views/board-dark.webp#gh-dark-mode-only)
![GITASK board with assignees and sub-tasks](packages/web/static/img/views/board-light.webp#gh-light-mode-only)

## Develop

Needs Node 22.18 or newer and pnpm 11.

```bash
pnpm install
pnpm test            # core tests run against real temporary git repos
pnpm typecheck
pnpm build       # CLI to packages/cli/dist, extension to packages/vscode/dist
pnpm package     # .vsix in packages/vscode/
```

Try the extension: open this folder in VS Code, press F5 on `packages/vscode` (Run Extension), then run **GITASK: Open Board**.

CLI: `pnpm gitask serve` (builds first if `dist` is missing), or `npx gitask-cli serve` / `pnpm dlx gitask-cli serve` / `yarn dlx gitask-cli serve` / `bunx gitask-cli serve`, or `npm i -g gitask-cli` then `gitask serve`.

## Release

Push a `vX.Y.Z` tag and CI publishes the CLI to npm and the extension to the VS Code Marketplace and Open VSX. See `Docs/architecture/release.md`.

## Behaviour to know

- Moves commit only that task's paths (`git commit -- <paths>`); other staged or dirty files are not touched. GITASK never pushes.
- Turn off committing with `gitask.autoCommit: false`.
- A task not tracked by git is moved with a plain rename and not committed.
- `.github/workflows/changelog.yml` appends a root `CHANGELOG.md` entry when a task is added to `Tasks/5-done/`.

## Status

Version 0.5.0: core, CLI, extension and UI are tested (`pnpm test`). Roadmap: sprints and the wider SDLC, cross-repo rollup, direct PDF export.

## Agent workflow

This repo uses the My-Agent-SetUp task board for its own work: see `Tasks/`, `Tasks/PIPELINE.md` and `AGENTS.md`.

MIT licensed.
