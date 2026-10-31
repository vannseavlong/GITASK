# People, sub-tasks, KPI export and a web UI: one release (proposed 0.5.0)

Updated: 2026-10-30 · Requirements: `Docs/requirements/views.md` (G7 adds sections for people, sub-tasks, report). No design frames exist; the reference is the owner's screenshots (VS Code tab, native date picker) and the shadcn component set.

## Goal
Five things, shipped together as one tag:
1. Assign a task to a repo contributor.
2. GITASK icon on the editor tab.
3. Sub-tasks with their own assignee and lane (backend, UX/UI, frontend).
4. Export what was done in a period, by person, as a manager-ready KPI report.
5. A modern UI (React + shadcn) that runs in VS Code and in any browser on a local port.

## Is item 5 possible? Yes
- The VS Code webview is Chromium, so React, Tailwind and shadcn (Radix + `react-day-picker`) run as they are. shadcn is source you copy in, not a runtime dependency.
- One UI package (`packages/ui`) talks to a `Host` interface. `VsCodeHost` uses `postMessage` (what exists today); `HttpHost` uses fetch + Server-Sent Events against `gitask serve --port N`. Same screens, two transports.
- The date picker in the screenshot is the browser's native `<input type="date">`. The shadcn range calendar in a popover replaces it, and the same component serves From/To.
- Costs, so nobody is surprised: it needs a build step (Vite) and a bigger bundle; the four views are rewritten (their pure `*-logic.ts` and tests are kept); Radix needs `style-src-attr 'unsafe-inline'` in the webview CSP (scripts stay nonce-only); the server opens a port, which is a security surface (below).

## Flow
| Step | State |
|---|---|
| Panel title only, no tab icon | change (`iconPath`) |
| Task `Owner:` is free text | change: picked from `people`, written by `setOwner` |
| People list | new: git history + `.mailmap`, saved in `Tasks/gitask.json` (names only) |
| Sub-tasks are anonymous checkboxes | change: `@person #lane` tokens, `## Sub-tasks` section |
| Card progress counts `## Done when` only | change: also counts `## Sub-tasks` |
| Done date | new: commit date of the move into `5-done/` or `6-deploy/`, fallback to `Updated` |
| Report build and render | new (core), used by UI, CLI and serve |
| Four views, string-built HTML | change: React + shadcn, logic modules kept |
| `gitask serve` | new |

## Screens and states
Board, List, Timeline, Overview (parity), task detail (+ sub-tasks panel), assignee combobox, people filter, date range popover, export dialog with live preview. States: no contributors yet, task unassigned, sub-task assigned to an unknown id, empty period, report with no tasks, port in use, expired or missing token.

## Data and API
No backend. Formats, all plain text in git:
- Task header unchanged: `- **Owner:** SNLRLONG`.
- Sub-task: `- [ ] Build login API @snlrlong #backend` under `## Sub-tasks`.
- `Tasks/gitask.json`: `{"columns": {...}, "people": [{"id":"snlrlong","name":"SNLRLONG","github":"snlrlong","role":"backend"}]}`.
- New webview/HTTP messages, all validated: `setOwner`, `addSubtask`, `setSubtaskAssignee`, `exportReport`.
- Report sections: header (period, filters, repo, generated date) · KPI tiles · per-person table (tasks done, sub-tasks done, on-time vs late, average days start→done, tier mix) · tasks by person · data notes. Formats: self-contained HTML (print to PDF), Markdown, CSV.

## Gaps and decisions
- **"Contributors" source.** The repo in the screenshot is private on GitHub; the GitHub API needs a token and network. Decision: use local git history (`git shortlog`) merged through `.mailmap`, with hand edits in `gitask.json` winning. Works offline, no secrets. GitHub API and avatars go to the backlog.
- **Identity.** The owner's own history has one person under two emails and another under two spellings, so email cannot be the key. Decision: a stable `id` slug per person in `gitask.json`; emails are read in memory only and never stored or exported.
- **Sub-tasks as files or checkboxes.** Decision: checkboxes with tokens, because the parser, toggle and progress already work on them and no new files appear in `Tasks/`. A sub-task cannot have its own status; it is done or not.
- **When was it done?** No done-date field exists. Decision: take it from the git move commit (moves already commit by pathspec), fall back to `Updated`, and print which source each row used.
- **PDF.** No headless-browser dependency. The HTML report has print CSS; "Print → Save as PDF" gives the file. Direct PDF is backlog.
- **Rewrite risk.** Features 1, 3 and 4 need new UI. Building them in the old string-built views and then again in React is waste, so core work runs first and the UI work waits for `Ext-ui-views`. Merges go to `main` as they finish; nothing publishes until `Ops-release-0-5` is tagged, so "one release" holds.
- **Local server safety.** Loopback only, random token, `Origin`/`Host` check, same message validation as VS Code; see `CLI-serve`.
- **Tier.** The report is an export of personal data and `serve` exposes a writable port, so both are T3 by the auto picker.

## GitHub Issues and Projects (can assignment notify people?)
Yes, with an opt-in link. Checked 2026-10-30 against GitHub Docs and changelog; the notification behaviour itself is GitHub's standard behaviour and was **not** verified in the docs search, so `Ext-github-sync` must test it on a real repo (G4).
- **Issues:** a REST/GraphQL issue can have assignees; GitHub notifies an assigned user in its own web, email and mobile channels. Nothing in a git commit or a `Tasks/*.md` file notifies anyone today, so a link to an issue is the only route to notifications.
- **Sub-issues:** native parent/child issues have REST endpoints (list, add, remove, reprioritize; [docs](https://docs.github.com/en/rest/issues/sub-issues)) and sub-issues inherit the parent's Project and Milestone ([changelog](https://github.blog/changelog/2025-09-11-a-rest-api-for-github-projects-sub-issues-improvements-and-more/)). This maps onto GITASK sub-tasks one to one.
- **Projects (v2):** a REST API for Projects exists since Sept 2025 (same changelog); older guides say GraphQL plus a `project` token scope, and sources disagree on fine-grained tokens, so the task must confirm the current scope before relying on it.
- **Auth, no secrets in the repo:** in VS Code use the built-in GitHub sign-in (`vscode.authentication.getSession('github', ...)`); in the CLI and `serve` use `GITHUB_TOKEN`. Tokens are never written to `gitask.json` or git.
- **Design:** GITASK files stay the source of truth. A task header gets `- **Issue:** #123`; "Sync to GitHub" is an explicit action (never silent), creates or updates the issue, sets its assignees from `Owner`, mirrors sub-tasks as sub-issues, and optionally sets the Project status from the column. Assignment in GITASK then notifies the person through GitHub. Two-way sync (issue edits flowing back) is out of scope.
- **Risk:** it writes to a third party and sends notifications to real people, so T3, opt-in per repo (`gitask.json` `github: {repo, project?}`), with a dry-run preview.

## Decisions from the owner (2026-10-30)
1. Version **0.5.0**.
2. **Jira style sub-tasks:** the List view expands a task into its sub-task rows (assignee, lane, tick); a Board card can be opened to show its sub-tasks with assignees. Sub-tasks count in `done/total`.
3. People carry a **GitHub name**, and the report shows it; emails are still never shown. GitHub name comes from `gitask.json` (`github`), else the login in a `users.noreply.github.com` commit email, else the git name.

## Open questions (recommendation)
1. ~~Is `Ext-github-sync` in 0.5.0?~~ Decided: yes, all in one release (owner, 2026-10-30). It is opt-in and last in the queue, but the release waits for it.
2. Add a `UI` task prefix? Recommend no: tasks use `Ext` and `CLI`; `AGENTS.md` lists fixed prefixes.

## Task breakdown
| Task | Repo area | Depends on | Tier | Size |
|---|---|---|---|---|
| Ext-tab-icon | vscode | none | T1 | 0.25d |
| Core-people | core | none | T2 | 1d |
| Core-subtask-assignee | core | none | T2 | 1d |
| Ext-ui-foundation | ui + vscode | none | T2 | 2d |
| Core-done-report | core | Core-people, Core-subtask-assignee | T3 | 2d |
| CLI-commands | cli | the three core tasks | T2 | 1d |
| Ext-ui-views | ui | Ext-ui-foundation | T2 | 2d |
| CLI-serve | cli + ui | Ext-ui-foundation | T3 | 2d |
| Ext-ui-assign | ui | Core-people, Ext-ui-views | T2 | 1d |
| Ext-ui-subtasks | ui | Core-subtask-assignee, Ext-ui-views | T2 | 1.5d |
| Ext-ui-export | ui + vscode | Core-done-report, Ext-ui-views | T3 | 1.5d |
| Ext-github-sync | core + vscode + cli | Core-people, Core-subtask-assignee, Ext-ui-views | T3 | 2.5d |
| Ops-release-0-5 | root | all, including Ext-github-sync | T3 | 1d |

About 18 to 19 working days on one agent; less in parallel.

**Waves**
- Wave 1, parallel now: Ext-tab-icon, Core-people, Core-subtask-assignee, Ext-ui-foundation. Overlap: `core/types.ts` (one field each, additive) and `parse.ts`/`config.ts` (different functions). Merge Core-people first.
- Wave 2: Core-done-report, Ext-ui-views (parallel; different packages), then CLI-commands, CLI-serve (both add one case to `cli/src/main.ts`; merge serve second and rebase).
- Wave 3, parallel: Ext-ui-assign, Ext-ui-subtasks (share `protocol.ts` and the detail panel; separate `case` blocks), then Ext-ui-export.
- Wave 4: Ext-github-sync (after the UI tasks; required for the release), then Ops-release-0-5.

## Next version (0.6.0 and later)
Sprints, Scrum and the wider SDLC (sprint planning, backlog grooming, estimates, burndown, retro, releases, QA and deploy stages) are planned for the next version; see `Tasks/1-backlog/Ext-scrum-sprints.md`. This release keeps room for it: sub-task lanes, people and the report are built so a sprint can filter and report on them.

## Out of scope
GitHub API contributors and avatars, direct PDF, per-sub-task status or due date, roles and permissions, scheduled or emailed reports, editing tasks inside the UI beyond what exists, hosted (non-local) deployment of `serve`. Listed in `Tasks/1-backlog/Ext-ui-later.md`.
