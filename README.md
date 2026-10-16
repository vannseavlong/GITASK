# GITASK

**Git + Task.** A Kanban board for a plain-Markdown `Tasks/` folder. One file per task, the folder is the status. Drag a card in VS Code and GITASK runs `git mv`, bumps the task's `Started / updated` date and commits that one file. No accounts: git is the identity and the history.

Built for workspaces installed from [My-Agent-SetUp](https://github.com/vannseavlong/Agent-SetUp), so humans and coding agents share one board.

## Packages

| Package | What |
|---|---|
| `packages/core` | Parse tasks, build the board, move/create tasks, changelog entries. No VS Code dependency. |
| `packages/cli` | `gitask board \| move \| new \| changelog` |
| `packages/vscode` | The Kanban webview extension |

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

## Develop

```bash
npm install
npm test            # core tests run against real temporary git repos
npm run typecheck
npm run build       # CLI to packages/cli/dist, extension to packages/vscode/dist
npm run package     # .vsix in packages/vscode/
```

Try the extension: open this folder in VS Code, press F5 on `packages/vscode` (Run Extension), then run **GITASK: Open Board**.

CLI: `node packages/cli/dist/gitask.js board --dir Tasks`

## Behaviour to know

- Moves commit only that task's paths (`git commit -- <paths>`); other staged or dirty files are not touched. GITASK never pushes.
- Turn off committing with `gitask.autoCommit: false`.
- A task not tracked by git is moved with a plain rename and not committed.
- `.github/workflows/changelog.yml` appends a root `CHANGELOG.md` entry when a task is added to `Tasks/5-done/`.

## Status

v0.1: core, CLI and extension are built and the core is tested. The webview has not yet been exercised in a real VS Code window by automated tests. Not published to a marketplace. Roadmap: YAML frontmatter support, filters, cross-repo rollup, read-only Pages dashboard.

## Agent workflow

This repo uses the My-Agent-SetUp task board for its own work: see `Tasks/`, `Tasks/PIPELINE.md` and `AGENTS.md`.

MIT licensed.
