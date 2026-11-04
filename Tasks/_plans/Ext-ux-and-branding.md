# UX fixes and project branding

Updated: 2026-11-05 · Source: owner feedback after releasing 0.5.2.

## Goal
Make the board feel finished (no raw file popping open, a proper delete dialog, tabs the user orders), fix the landing page install story, and let a project carry its own identity (title, subtitle, logo, layout) across the board, `gitask serve` and reports.

## Flow (exists / change / new)
| Step | State |
|---|---|
| Board "New task" sends `new`; `newTask()` in `extension.ts` creates the file, then `showTextDocument` opens it | **change**: drop the open; stay on board |
| Delete: UI sends `deleteTask`; VS Code shows a native `showWarningMessage` modal; browser already has `DeleteConfirm` and `confirmed: true` | **change**: VS Code uses the in-app dialog, extension requires `confirmed` like `serve` does |
| Tabs: `VIEWS` in `views/registry.tsx` (Board, List, Timeline, Overview); `ui.view` remembered | **change**: Overview first, order draggable and remembered |
| Landing: Marketplace link only in footer and "Other places"; three OS cards with the same steps | **change**: Marketplace in hero/nav/install; one install block |
| Project identity: only column colours, people and github in `Tasks/gitask.json` | **new**: `project` block, header render, settings dialog, report header |

## Screens and states
- Project header: none set (hidden, today's look) · title only · title + logo · logo broken/missing (title only) · narrow width.
- Delete dialog: checking impact · recoverable · not recoverable · cancel with Esc.
- Tabs: default order · dragging (drop marker) · saved order containing an unknown id.

## Data and API
- `Tasks/gitask.json` `project`: `title`, `subtitle`, `logo` (file inside `Tasks/`), `layout.align` left|center|right, `layout.size` sm|md|lg, `layout.logoPosition` left|top|right|hidden, `layout.showTitle`.
- `BoardData.project` carries the validated values; the logo bytes never travel in the board payload (webview URI in VS Code, a fixed route in `serve`).
- New message `setProject` (write); validated in `validateMessage`; commits `Tasks/gitask.json` by pathspec only.
- `UiState.viewOrder: string[]` in the host's remembered state.

## Gaps and decisions
- No design exists for the header; layout options follow the owner's list (alignment, size, "more layout") and stay to the four fields above. More options go to the backlog. Decision: ship these, collect feedback.
- Logo: user input is a file under `Tasks/`, so it is committed with the project and works in `serve`. SVG is allowed but only rendered through `<img>`. Size cap and extension allow-list in core.
- Webview CSP has no `img-src` today; the header task adds it for the extension's own sources only.
- Tab drag: the board already uses native HTML5 drag, so no new dependency; keyboard reorder added for accessibility.
- `Ext-verify-in-vscode` (T-0005, in todo) checks "new task, open file", which this plan changes. It runs last, on a build that contains the UX tasks, and its check is rewritten to the new behaviour.
- Backlog picked up: `Ops-web-home-a11y` (landing, small, fits the same release), the logo/company header idea of `Ext-ui-later` (becomes `Core-report-header`). Not picked: `Ext-scrum-sprints` (needs its own plan), `Ext-more-ideas`, `Ops-web-later`, `WEB-SEO` (empty template), `Ops-bump-root-version` (T3 release scripts, unrelated).

## Open questions (recommendation first; planning does not wait)
1. After creating a task, open its detail panel? **Recommend yes**: the user sees the new card and can fill it in, still on the board.
2. Should Overview also be the opened-by-default view? **Recommend yes** for new users; a saved choice always wins.
3. Version: ship as 0.6.0 (new feature: project header) rather than 0.5.3. **Recommend 0.6.0**; the release task is cut when the wave is merged.

## Task breakdown
| Task | Repo | Depends on | Tier | Size |
|---|---|---|---|---|
| Ext-new-task-stay-on-board (T-0067) | vscode | none | T1 | 0.5d |
| Ext-delete-dialog (T-0068) | ui + vscode | none | T2 | 1d |
| Ops-web-install-simplify (T-0069) | web | none | T1 | 1d |
| Ops-web-home-a11y (T-0061) | web | none | T1 | 0.5d |
| Ext-view-order (T-0070) | ui + vscode | none | T2 | 1d |
| Core-project-config (T-0071) | core | none | T2 | 1d |
| Ext-project-header (T-0072) | ui + vscode + cli | Core-project-config, Ext-view-order | T2 | 1.5d |
| Ext-project-layout-settings (T-0073) | ui + core + vscode + cli | Ext-project-header | T2 | 1.5d |
| Core-report-header (T-0074) | core | Core-project-config | T2 | 1d |
| Ext-verify-in-vscode (T-0005) | vscode | the three UX tasks | T1 | 0.5d |

## Parallel groups
- **Wave 1 (all parallel, separate worktrees):** Ext-new-task-stay-on-board, Ext-delete-dialog, Ops-web-install-simplify, Ops-web-home-a11y, Ext-view-order, Core-project-config. Overlaps: the first two both edit `extension.ts` but in different cases, so rebase the later one; install-simplify and home-a11y both touch `landing.css` in different regions.
- **Wave 2 (after Core-project-config and Ext-view-order merge):** Ext-project-header, Core-report-header.
- **Wave 3:** Ext-project-layout-settings, then Ext-verify-in-vscode, then a release task.

## Out of scope
Per-view headers, themes or fonts for the header, a logo editor/cropper, branding the marketing site, sprints.
