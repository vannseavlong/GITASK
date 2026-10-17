# Changelog

Merges to `main` across all projects, newest first. Tags: `[Core]`/`[CLI]`/`[Ext]`/`[Ops]`. Format and rules: `Tasks/README.md`.

## 2026-10-17 · [Ops] feat: Ops-publish-prep
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-publish-prep.md
- Branch/PR: `feat/release-cicd`
- What changed: CI/CD release on a `v*` tag (same pattern as longcelot-sheet-staging): test, then publish `gitask-cli` to npm, and the extension to VS Code Marketplace + Open VSX, attach the .vsix to a GitHub Release. Switch dev to pnpm. Real publisher id, repo URL, icon, screenshot/GIF in README, then publish to VS Code Marketplace and Open VSX (needs the owner's accounts and tokens; do not publish without owner approval).

## 2026-10-17 · [Ops] feat: Ops-npm-audit
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-npm-audit.md
- Branch/PR: `feat/npm-audit`
- What changed: Review the npm audit warnings from install; fix or document each.

## 2026-10-17 · [Ext] feat: Ext-webview-board
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-webview-board.md
- Branch/PR: main
- What changed: Kanban webview with drag-and-drop, open file, new task, file watcher, settings.

## 2026-10-17 · [Ext] feat: Ext-view-shell
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-view-shell.md
- Branch/PR: `feat/view-shell`
- What changed: Split the one-page board into a view shell: a tab bar (Board, List, Timeline, Overview), a view registry that each view registers into, a typed message protocol between webview and extension, a strict Content-Security-Policy, and the last-used view remembered. The Board becomes the first registered view with sub-task progress on cards.

## 2026-10-17 · [Ext] feat: Ext-timeline
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-timeline.md
- Branch/PR: `feat/timeline`
- What changed: Calendar and waterfall. Calendar: month grid with due dates. Waterfall: one bar per task from Started to Due, arrows from `Depends on`, a today line, zoom by week or month. Tasks without `Due` get an open-ended bar.

## 2026-10-17 · [Ext] feat: Ext-task-detail
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-task-detail.md
- Branch/PR: `feat/task-detail`
- What changed: Open a task from a card or row into a detail panel: title, header fields, each section rendered as Markdown, sub-task checkboxes you can toggle, progress bar, and an Open file button. Replaces opening the raw `.md` as the default click.

## 2026-10-17 · [Ext] feat: Ext-overview
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-overview.md
- Branch/PR: `feat/overview`
- What changed: A project dashboard: counts per status, tier and owner; tasks not updated for N days (setting, default 14); claimed tasks; overdue tasks; the last 10 moves from git history. Numbers come from a pure `stats` function in core so the CLI can reuse it later.

## 2026-10-17 · [Ext] feat: Ext-list-view
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-list-view.md
- Branch/PR: `feat/list-view`
- What changed: A table of every task: title, status, tier, owner, claimed by, updated, due, progress. Sort by any column, filter by status/tier/owner, search by text, click to open the detail.

## 2026-10-17 · [Core] feat: Core-task-model
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-task-model.md
- Branch/PR: `feat/task-model`
- What changed: Extend the task model: parse sub-tasks (checkbox lines grouped by `

## 2026-10-17 · [Core] feat: Core-frontmatter-support
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-frontmatter-support.md
- Branch/PR: `feat/frontmatter`
- What changed: Also parse YAML frontmatter in task files; keep the folder as the status source.

## 2026-10-16 · [Ops] feat: Ops-github-remote
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-github-remote.md
- Branch/PR: `feat/<short-name>`
- What changed: Create the GitHub repo and push, then confirm ci.yml and changelog.yml run green. Ask the owner before creating or pushing.

## 2026-10-17 · [Ops] feat: Ops-ci-release
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ops-ci-release.md
- Branch/PR: main
- What changed: CI (typecheck, test, package vsix), README, MIT license.

## 2026-10-17 · [Core] feat: Core-changelog
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-changelog.md
- Branch/PR: main
- What changed: Idempotent changelog entry from task metadata.

## 2026-10-17 · [CLI] feat: CLI-gitask
- Owner: SNLRLONG
- Task: Tasks/6-deploy/CLI-gitask.md
- Branch/PR: main
- What changed: gitask board | move | new | changelog from the terminal.

## 2026-10-17 · [Core] feat: Core-move-create
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-move-create.md
- Branch/PR: main
- What changed: Move a task between columns (git mv, bump date, commit by pathspec) and create tasks from _TEMPLATE.md.

## 2026-10-17 · [Core] feat: Core-parse-board
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Core-parse-board.md
- Branch/PR: main
- What changed: Parse task files and build the board (columns from numbered folders).
