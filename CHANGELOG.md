# Changelog

Merges to `main` across all projects, newest first. Tags: `[Core]`/`[CLI]`/`[Ext]`/`[Ops]`. Format and rules: `Tasks/README.md`.

## 2026-11-04 · [Ext] feat: Ext-verify-in-vscode
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-verify-in-vscode.md
- Branch/PR: `fix/verify-in-vscode`
- What changed: Run the extension (F5 on packages/vscode) and `gitask serve` on a workspace with Tasks/, and walk through everything shipped in the UX wave. Nothing in it has been seen in a real VS Code webview or browser yet; only unit tests and headless screenshots back it. Fix bugs found, then move Ext-webview-board to 5-done.

## 2026-11-05 · [Ext] chore(release): 0.6.0, project header, tab order, Add status
- Owner: SNLRLONG
- Task: Ops-release-0-6-0 (T-0077) · Branch/PR: chore/release-0-6-0
- What changed: version 0.6.0 for `gitask-cli` and `gitask-vscode`. New: project title, subtitle and logo header with a settings dialog and report header; Overview-first tabs you can reorder; Add status; create keeps you on the board; in-app delete dialog; responsive Activity chart. Extension README, user docs (new project-header page) and the website "What's new" updated. Details are in the entries below.
- Needs: owner merges, tags `v0.6.0`, approves the `release` environment, uploads the .vsix to the Marketplace by hand (`VSCE_PAT` is not set), then runs `pnpm deploy:web` from `main`

## 2026-11-05 · [Ext] fix: responsive Activity heatmap, no split button
- Owner: SNLRLONG
- Task: Ext-ui-polish-2 (T-0081) · Branch/PR: fix/ui-polish-2
- What changed: the Activity heatmap now scales to the card width (aspect kept, 480 px minimum then scrolls) and no month label can clip. Removed the "Split into backend / UX/UI / frontend" button and `SPLIT_TEMPLATE`; sub-tasks are added by hand.

## 2026-11-05 · [Ext] fix: project header polish
- Owner: SNLRLONG
- Task: Ext-project-header-polish (T-0083) · Branch/PR: fix/project-header-polish
- What changed: The logo upload is now a drop zone (idle, drag-over, selected with checkerboard thumbnail, name, size, Replace and Remove, and an in-area error) over a hidden file input, with keyboard support. The "Hide the title" option (`layout.showTitle`) is removed from the dialog, header, report, config rules and protocol; an old key in `gitask.json` is ignored on read and dropped on the next save. The header's "Customize header" button became a kebab menu in the corner (a quiet "Add project header" action when there is no project).
- Needs: none

## 2026-11-05 · [Ext] feat: Add status from the board
- Owner: SNLRLONG
- Task: Ext-add-status (T-0082) · Branch/PR: feat/add-status
- What changed: "+ Add status" on the board opens a dialog (name, optional colour, position) and sends the new `addColumn` message; core `addColumn` creates the next numbered folder with a `.gitkeep` and commits that path only (`status(<id>): add`), and `validateStatusName` is the one shared name check (ASCII letters, digits, spaces, hyphens; no traversal, hidden, reserved, duplicate or over-long names). Both `gitask serve` and the VS Code extension answer `columnAdded`. See `Docs/architecture/ui.md`, `task-format.md`.
- Needs: a check in a real VS Code webview

## 2026-11-05 · [Core] refactor: one shared "delete needs confirmed" rule
- Owner: SNLRLONG
- Task: Core-confirm-rule-shared (T-0080) · Branch/PR: refactor/confirm-rule-shared
- What changed: `unconfirmedDelete` moved to `packages/core/src/confirm.ts`; `gitask serve` and the VS Code extension both call it (same messages, strict `confirmed === true`). Removed the dead `confirmsDelete:false` path in `delete-flow.ts`. Tests cover every delete message type in the protocol. Drop-marker contrast measured at 8.6:1 or better in light, dark and high-contrast, no change needed.

## 2026-11-05 · [Ext] fix: Customize header dialog feedback
- Owner: SNLRLONG
- Task: Ext-header-dialog-feedback (T-0078) · Branch/PR: fix/header-dialog-feedback
- What changed: the dialog stays open until the host answers `setProject` with the new `projectSaved` reply, and on failure keeps the draft and shows the error; only fields that differ are sent (no change sends nothing and makes no commit); `Board.project.logo` carries a `version` (mtime and size) so a logo replaced by hand under the same name is refetched. Diff logic in `packages/ui/src/lib/project-diff.ts`. See `Docs/architecture/ui.md`, `config.md`.
- Needs: a check in a real VS Code webview

## 2026-11-05 · [Core] fix: harden project logo handling
- Owner: SNLRLONG
- Task: Core-logo-hardening (T-0079) · Branch/PR: fix/logo-hardening
- What changed: replacing or removing the logo deletes the previous generated `logo-<hex>.<ext>` in the same pathspec commit (only an exact generated name whose content hashes to it; hand-named files never); generated names use 16 hex; `readLogoBytes` verifies after the open that the real path is inside the real Tasks folder and is the same file; `gitask serve` allows the larger body only for `setProject` and refuses an oversize `Content-Length` before reading; SVG logos are checked with an element and attribute allow-list instead of a deny-list (`<image>`, `<a>` and Inkscape/Sodipodi metadata are no longer accepted). See `Docs/architecture/config.md` and `serve.md`.
- Needs: a separate code and security review; a check in a real VS Code webview

## 2026-11-05 · [Ext] fix: view tab drag and keyboard polish
- Owner: SNLRLONG
- Task: Ext-view-tabs-polish (T-0076) · Branch/PR: fix/view-tabs-polish
- What changed: tabs reorder by pointer events (works in Firefox); dragging no longer activates the tab or sends a `view` message; drops in the gap, on the strip and on Reset land; Alt+Arrow and drag moves are announced via an `aria-live` region; the drop marker uses the foreground colour; focus returns to the active tab after Reset. Pure logic in `packages/ui/src/lib/view-order.ts`, tests in `packages/vscode/test/view-order.test.ts`.
- Needs: a check in a real VS Code webview and Firefox

## 2026-11-05 · [Ext] feat: customize the project header from the board
- Owner: SNLRLONG
- Task: Ext-project-layout-settings (T-0073) · Branch/PR: feat/project-layout-settings
- What changed: "Customize header" dialog with live preview (title, subtitle, alignment, size, logo position, hide title, logo upload, Reset layout). New `setProject` message validated in core for VS Code and `gitask serve`; an uploaded logo is checked by content, stored in `Tasks/` under a generated name and committed with `gitask.json` only. The header refetches its logo after a save or after a failed fetch. See `Docs/architecture/config.md`.
- Needs: a check in a real VS Code webview and in a browser with a real file picker

## 2026-11-05 · [Ext] feat: new task opens its detail panel
- Owner: SNLRLONG
- Task: Ext-new-task-open-detail (T-0075) · Branch/PR: feat/new-task-open-detail
- What changed: after a task is created from the board, the host sends a `taskCreated { path }` message (VS Code and `gitask serve`; nothing on failure) and the UI opens that task's detail panel once the card is on the board.
- Needs: a check in a real VS Code webview and in a browser

## 2026-11-05 · [Core] feat: project header in reports
- Owner: SNLRLONG
- Task: Core-report-header (T-0074) · Branch/PR: feat/report-header
- What changed: HTML reports show the project title, subtitle and logo (logo re-validated at report time and inlined as a `data:` image, per `project.layout`); Markdown reports start with the title; CSV unchanged. Export dialog gets an "Include project header" toggle (`includeHeader` in the report request). See `Docs/architecture/config.md`.

## 2026-11-05 · [Ext] feat(ui): project header with title, subtitle and logo
- Owner: SNLRLONG
- Task: Ext-project-header (T-0072) · Branch/PR: feat/project-header
- What changed: the board and `gitask serve` show the project title, subtitle and logo above the tabs on every view, following `project.layout`. Nothing shows without a `project` block. The logo is served by one core helper that re-checks the file on every request (`GET /api/logo` in the browser, a `readLogo` message in VS Code); SVG only through `<img>`; the webview CSP gains `img-src`. See `Docs/architecture/ui.md`.
- Needs: a check in a real VS Code webview (dark and high contrast) and `gitask serve`; Ext-project-layout-settings to edit it from the UI

## 2026-11-05 · [Core] feat: project identity block in gitask.json
- Owner: SNLRLONG
- Task: Core-project-config (T-0071) · Branch/PR: feat/project-config
- What changed: `Tasks/gitask.json` can carry a `project` block (title, subtitle, logo inside `Tasks/`, layout). Core validates it (no traversal or symlinks, 1 MiB logo cap, invisible characters stripped) and `setProject` writes it. Nothing renders it yet. See `Docs/architecture/config.md`.
- Needs: Ext-project-header to show it

## 2026-11-05 · [Ext] feat(ui): reorderable tabs, Overview first
- Owner: SNLRLONG
- Task: Ext-view-order (T-0070) · Branch/PR: feat/view-order
- What changed: the tabs open in the order Overview, Board, List, Timeline, and can be dragged or moved with Alt+Left/Right; the order is remembered, with a Reset button. Overview is also the first view in `gitask serve`.
- Needs: a check in a real VS Code webview and in Firefox (drag does not work on buttons there; Alt+arrows do)

## 2026-11-05 · [Ops] feat(web): one install block and Marketplace buttons
- Owner: SNLRLONG
- Task: Ops-web-install-simplify (T-0069) · Branch/PR: feat/web-install-simplify
- What changed: the hero and navbar link the VS Code Marketplace; the three per-OS install cards and OS detection are replaced by one install block (Marketplace, Open VSX, `code --install-extension`, .vsix fallback, CLI).
- Needs: light theme and Lighthouse check

## 2026-11-05 · [Ops] fix(web): use a list for the CLI commands
- Owner: SNLRLONG
- Task: Ops-web-home-a11y (T-0061) · Branch/PR: fix/web-home-a11y
- What changed: the CLI commands on the home page are a semantic list instead of an ARIA table, to clear the `aria-required-children` failure.
- Needs: Lighthouse run to confirm Accessibility 100

## 2026-11-05 · [Ext] fix(ui): delete uses the in-app dialog in VS Code
- Owner: SNLRLONG
- Task: Tasks/4-testing/Ext-delete-dialog.md (T-0068) · Branch/PR: fix/delete-dialog
- What changed: deleting a task, an empty status or a sub-task in VS Code now shows the themed in-app confirm dialog (impact text, red Delete, Esc cancels) instead of the native popup. The extension refuses any delete not marked `confirmed: true`, as `gitask serve` does.
- Needs: none

## 2026-11-05 · [Ext] fix: creating a task keeps you on the board
- Owner: SNLRLONG
- Task: Ext-new-task-stay-on-board (T-0067) · Branch/PR: fix/new-task-stay-on-board
- What changed: "New task" (board or `GITASK: New Task`) no longer opens the raw `.md`. The board is revealed, the card appears, and a non-modal notice offers "Open file". Errors still show an error message.
## 2026-11-02 · [Ext] chore(release): 0.5.2, one screenshot per view in the listing README
- Owner: SNLRLONG
- Task: Ops-release-0-5-2 (T-0066) · Branch/PR: chore/release-0-5-2
- What changed: version 0.5.2 for `gitask-cli` and `gitask-vscode`. The extension README keeps one dark screenshot for the board and one for the task detail; 0.5.1 showed each twice on the Marketplace, which ignores the GitHub dark/light image fragments. The root README is unchanged.
- Needs: owner merges, tags `v0.5.2`, approves the `release` environment, uploads the .vsix to the Marketplace by hand (`VSCE_PAT` is not set).
## 2026-11-01 · [Ops] feat: Ops-web-search-console
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-search-console.md
- Branch/PR: `feat/web-search-console`
- What changed: Prepare the site for Google Search Console: add the owner-supplied `google-site-verification` meta tag and keep the `/search` page out of the sitemap.

## 2026-11-02 · [Ops] feat(web): Google Search Console verification tag, search page out of the sitemap
- Owner: SNLRLONG
- Task: Ops-web-search-console (T-0065) · Branch/PR: feat/web-search-console
- What changed: the `google-site-verification` meta tag (a public ownership token) is added site wide through `docusaurus.config.ts`, and `/search` is excluded from `sitemap.xml`.
- Needs: owner runs `pnpm deploy:web`, clicks Verify in Search Console, submits `sitemap.xml` and requests indexing.
## 2026-11-02 · [Ext] chore(release): 0.5.1, refreshed listing README
- Owner: SNLRLONG
- Task: Ops-release-0-5-1 (T-0064) · Branch/PR: chore/release-0-5-1
- What changed: version 0.5.1 for `gitask-cli` and `gitask-vscode`. The only code-free change since 0.5.0 is the extension README: "Getting started in 5 steps", real board and task detail screenshots, and a link to the new guide. The listing only updates on a new version.
- Needs: owner merges, tags `v0.5.1`, approves the `release` environment; check the README renders on the Marketplace and Open VSX.
## 2026-11-02 · [CLI] fix(test): find-tasks test no longer fails on a stray parent .git
- Owner: SNLRLONG
- Task: Core-test-isolate-git-repo (T-0060) · Branch/PR: fix/test-isolate-git-repo
- What changed: the "outside a git repo" test now skips (with the reason) when a parent of the temp folder holds a `.git`, such as an empty `/tmp/.git`, instead of failing. This had blocked `pnpm deploy:web`, which runs the tests. No product code changed.
## 2026-11-02 · [Ops] fix(web): HTML pages are no longer cached for an hour
- Owner: SNLRLONG
- Task: Ops-web-cache-headers (T-0063) · Branch/PR: fix/web-cache-headers
- What changed: `firebase.json` now sets `Cache-Control: public, max-age=0, must-revalidate` for `/`, `/docs/**` and `/search`. The old `**/*.html` rule never matched clean URLs, so Firebase served HTML with `max-age=3600` and a visitor could get old HTML pointing at replaced hashed assets after a deploy.
- Needs: owner runs `pnpm deploy:web`, then `curl -sI https://gitask-me.web.app/docs/faq | grep -i cache-control` shows `max-age=0, must-revalidate`.
## 2026-11-02 · [Ops] feat(web): local deploy to Firebase Hosting, preview channel, web CI
- Owner: SNLRLONG
- Task: Ops-web-deploy (T-0006) · Branch/PR: feat/web-deploy · not merged yet
- What changed: `scripts/deploy-web.sh` with `pnpm deploy:web` (main + clean tree only, typecheck, tests, build, typed confirmation) and `pnpm deploy:web:preview` (`staging` channel, 7d expiry); `firebase-tools` pinned to 15.34.0 instead of `@latest`; `deploy:pro` kept as an alias and the unpinned `deploy` script in `packages/web` removed; `ci.yml` gets a read-only `web` job (typecheck + build, no secrets, no deploy); `release.md` "Website" section (rollback, first-deploy checklist, outage); site linked from the README. Cache headers checked against the real build, no change needed.
- Needs: owner runs `firebase login` and the first deploy; `seo-checklist` re-run on the live URL.
## 2026-11-01 · [Ext] feat: Ext-readme-screens
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-readme-screens.md
- Branch/PR: `docs/readme-screens`
- What changed: Drop the demo video/GIF plan. Use the real screenshots already on main everywhere a `TODO(demo)` or `TODO(screenshot)` was left.

## 2026-11-01 · [Ops] feat: Ops-web-scaffold
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-scaffold.md
- Branch/PR: `feat/web-scaffold`
- What changed: Create `packages/web` as a Docusaurus 3 site (React, TypeScript) with the portfolio brand in one `src/css/custom.css`, and a custom home page (`src/pages/index.tsx`): hero, views preview, features, how it works, footer. The Download section is a static placeholder with its final layout; `Ops-web-downloads` makes it live.

## 2026-11-01 · [Ops] feat: Ops-web-downloads
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-downloads.md
- Branch/PR: `feat/web-downloads`
- What changed: Make the Download section real: detect the OS, resolve the latest release's `.vsix` from the GitHub API, show Mac/Windows/Linux cards (same file, OS-specific install command), "Install in VS Code", and a command-line tab (`npm i -g gitask-cli`, `npx gitask-cli board`), with copy buttons and fallbacks.

## 2026-11-01 · [Ops] feat: Ops-web-docs
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-docs.md
- Branch/PR: `feat/web-docs`
- What changed: User documentation on the site: Getting started (install, first board), Task format (folders, header fields, sub-tasks, `Due`, `Depends on`), CLI reference (`board`, `move`, `new`, `changelog`), the VS Code views, FAQ. Local search, no Algolia account.

## 2026-11-02 · [Ops] feat(web): real Download section with OS detection and latest release
- Owner: SNLRLONG
- Task: Ops-web-downloads (T-0008) · Branch/PR: feat/web-downloads · not merged yet
- What changed: the Download section detects macOS, Windows, Linux, mobile or unknown from the user agent, resolves the latest `.vsix` by extension from the GitHub Releases API (unauthenticated, cached in `sessionStorage`), and shows per-OS cards with a PowerShell or shell install command, "Install in VS Code", the CLI commands and Open VSX/Marketplace/Releases links. Network, 403/429, 404 and no-`.vsix` failures show those fallback links; release text is never rendered. Server-rendered links work with JavaScript off; copy buttons announce their result. Pure logic in `src/lib/os.ts` and `src/lib/release.ts`, tested with `node:test` (`packages/web/test`, added to root `pnpm test`).
- Needs: none; checked against the real v0.5.0 release.
## 2026-11-02 · [Ops] feat(web): task format, views and FAQ docs, local search
- Owner: SNLRLONG
- Task: Ops-web-docs (T-0007) · Branch/PR: feat/web-docs · not merged yet
- What changed: new docs pages Task format, Views and FAQ (sidebar updated); CLI reference re-checked against `gitask --help`; local search with `@easyops-cn/docusaurus-search-local` 0.55.3 (index built at build time, no account), registered in `docusaurus.config.ts`.
## 2026-11-02 · [Ops] feat(web): SEO and sharing metadata for the site
- Owner: SNLRLONG
- Task: Ops-web-seo (T-0009) · Branch/PR: feat/web-seo · not merged yet
- What changed: unique home title/description, canonical and `og:*` from the one `SITE_URL`, 1200x630 OG image (`static/img/og.png`, built from the real board screenshot) as the default for every page, `twitter:card=summary_large_image`, `SoftwareApplication` JSON-LD on the home page, favicon set, `site.webmanifest`, `theme-color`, and a `robots.txt` generated at build time naming `/sitemap.xml`.
- Needs: `Ops-web-deploy` sets the final `SITE_URL`; re-run the checklist then.
## 2026-11-02 · [Ops] feat(web): real screenshots in the landing Views section
- Owner: SNLRLONG
- Task: Ops-web-screenshots (T-0057) · Branch/PR: feat/web-screenshots
- What changed: the CSS-drawn view thumbnails are replaced by WebP screenshots of the browser board (Board, Task detail, List, Timeline, Overview; dark and light, 1280x800, each under 100 KB) in `packages/web/static/img/views/`. The image follows the Docusaurus colour mode through `[data-theme]` show/hide; dead `.thumb-*` CSS removed.
## 2026-11-02 · [Ops] fix(web): landing navbar label, GitHub icon, hamburger and portfolio link
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ops-web-landing-fixes.md
- Branch/PR: fix/web-landing-fixes · not merged yet
- What changed: navbar item reads "What's new"; inline-SVG GitHub mark (`GitHubIcon`) in navbar and footer; the hamburger no longer shows on desktop (the minified CSS let `.icon-link` override the hide rule) and the mobile panel is opaque, closes on Escape, link tap or outside tap, and has `aria-controls`; portfolio link stored in `links.portfolio` and shown in the footer ("Built by Vann Seavlong") and Community column.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): new task dialog with title, description, start/due, tier, status and member
- Owner: SNLRLONG
- Branch/PR: feat/new-task-dialog-fields · merged to main (c0cff3b)
- What changed: the new task dialog mirrors the edit dialog look (Field labels, grid form, DialogFooter) and collects title (required), description, start date, due date, tier, status (dropdown of columns) and member (dropdown of contributors) before creating, in the browser and in VS Code. Core gains `createTaskWithFields` writing the full task file (description into `## Goal`, start/due/tier/owner headers). The `new` message carries the validated fields; both hosts create via `createTaskWithFields`. Protocol validation added for title/description/start/due/tier/owner; tests cover accepted and rejected values.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): new-task dialog and always-visible GitHub sync button
- Owner: SNLRLONG
- Branch/PR: feat/new-task-dialog · merged to main (dfb8d8c)
- What changed: creating a task now opens a dialog that asks for the task id (the H1 title) and target status before creating, in the browser and in VS Code; the `new` message carries an optional validated id and hosts fall back to a generated id when none is given. Sync to GitHub is always visible in the browser filter bar instead of only when `Tasks/gitask.json` already has a github block; when not configured the dialog shows setup instructions.
- Needs: none

## 2026-10-30 · [Ext] feat(report): simple report
- Owner: SNLRLONG
- Task: Tasks/4-testing/Ext-report-simple.md
- Branch/PR: feat/report-simple · merged to main (c68308c)
- What changed: the report is now three tiles (tasks done, sub-tasks done, people) and one section per person with their done tasks and finished sub-tasks; `late` tag only when a Due date exists. Removed per-person tables, tier mix, data notes and date-source labels. CSV is `person,task,sub_task,done_date,sub_tasks_done`. Escaping, CSV formula neutralisation and no-email rules unchanged.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): modern date range picker
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-date-picker.md
- Branch/PR: feat/ui-date-picker · merged to main (75f75f8)
- What changed: the date range picker is a popover card with a light range band, rounded start/end, normal-weight numbers and Clear / Apply buttons; closing without Apply keeps the old range. Uses theme tokens.
- Needs: none

## 2026-10-30 · [Ext] feat(brand): colourful tab icon and favicon
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-brand-icon.md
- Branch/PR: feat/brand-icon · merged to main (e01d47e)
- What changed: one coloured icon (`media/icon.svg`, `icon.png` 256 px) on the VS Code tab; `gitask serve` serves `/favicon.svg` and `/favicon.png` so the browser tab shows the icon.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): dashboard charts on the Overview tab
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-dashboard-charts.md
- Branch/PR: feat/ui-dashboard-charts · merged to main (2238de1)
- What changed: Overview tab gains real charts: donut by status and by tier, bar per person (owner + sub-task assignees) and completed per week (last 12 weeks), and a GitHub-style activity heatmap of the last 12 months. Core gains `taskActivity(dir)`/`taskActivityCached(dir)`: one `git log --since --name-only`, committer dates, counts per day, `[]` outside git/empty repo, never throws, cached by HEAD; exposed as an `activity` field on the board payload in both hosts (heatmap always the full year, status/tier/person charts follow the existing filters). Charts use theme tokens (`--chart-*`, `--heat-*`), accessible palette, tooltips with numbers, `role=img` + `aria-label`, empty states, hand-made SVG (no new dependency).
- Needs: none

## 2026-10-30 · [Ext] feat(ui): browser System/Light/Dark theme with custom colour tokens
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-theme.md
- Branch/PR: feat/ui-theme · merged to main (d9ba1eb)
- What changed: browser-only System/Light/Dark toggle applied before first paint (inline nonce script under the existing CSP, no unsafe-inline) and remembered in localStorage; hidden in VS Code which owns its theme. Theme popover: presets (Neutral, Blue, Green, Violet, Orange, Red), custom #rrggbb for primary/accent/background/card/border, radius slider 0-20, live preview, Reset, strict JSON export/import (unknown keys dropped). Every custom value is validated and applied only through `document.documentElement.style.setProperty`; contrast warns below 4.5:1. Explicit light/dark token sets in `index.css` so charts and the calendar follow the theme.
- Needs: none

## 2026-10-30 · [CLI] feat(cli): npx/gitask-cli serve, walk-up Tasks discovery and init
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-npx-run.md
- Branch/PR: feat/npx-run · merged to main (8dbcdb1)
- What changed: `bin` exposes both `gitask` and `gitask-cli` from `dist/gitask.js` (shebang + exec bit survive `npm pack`); `gitask serve` with no `--dir` walks up to find `Tasks/` and fails with a clear `init` suggestion; new `gitask init` scaffolds `Tasks/`; root `pnpm gitask` / `pnpm serve` scripts build the CLI first when `dist` is missing. Verified via `npm pack`: `npx --yes <tarball> serve` and `pnpm dlx <tarball> serve` both serve (200 page, 401 on `/api/board` without token). `yarn dlx` and `bunx` were not available in this environment. Docs show the four runners and `npm i -g gitask-cli`.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): edit/delete tasks and sub-tasks from a three-dots menu
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-edit-delete.md
- Branch/PR: feat/ui-edit-delete · merged to main (cbf8178)
- What changed: kebab (vertical ellipsis) DropdownMenu replaces the trash icon on Board cards, List rows, the detail panel and sub-task rows (aria-label, stopPropagation, keyboard accessible). Edit task: title, due, tier T0-T3, owner (reuse picker), claimed by; core `updateTask` rewrites only patched lines, keeps CRLF, never renames, asserts regular file (symlink refused), commits by pathspec with `fillTemplate`. Edit/delete sub-task: text, assignee, lane; `deleteSubtask` removes exactly the index+line checkbox line. Delete keeps safeguards: VS Code modal, browser confirm with the `confirmed` flag. `editTask`/`editSubtask`/`deleteSubtask` validated in core protocol and handled identically in the extension and `gitask serve` through `serialQueue`. MockHost supports them; tests cover CRLF, `$&`, newline injection, stale line, symlink, protocol rejections and handler over HTTP.
- Needs: none

## 2026-10-30 · [Ops] chore(release): 0.5.0
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-release-0-5.md
- Branch/PR: feat/release-prep (into release/0.5.0, then main) · tag `v0.5.0` by the owner
- What changed: CLI and extension bumped to 0.5.0 with `pnpm bump`; `engines.node` is `>=22.18` at the repo root (tests run TypeScript through Node type stripping). README files, the website docs and the docs index cover people, sub-tasks, the report, `gitask serve` and GitHub sync.
- Needs: owner tags `v0.5.0` and approves the `release` environment; Marketplace screenshots still to be captured

## 2026-10-30 · [Ext] feat(github): sync tasks to GitHub Issues
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-github-sync.md
- Branch/PR: feat/github-sync
- What changed: opt-in, one-way sync (`"github"` in `Tasks/gitask.json`). `gitask github plan` is a dry run, `gitask github sync --yes` and `GITASK: Sync to GitHub` apply it: issue per task, assignee from the Owner's GitHub name, sub-tasks as sub-issues, optional Project status, `Issue:` line written back. Token from `GITHUB_TOKEN` or the VS Code GitHub sign-in, never stored.
- Needs: a GitHub token with Issues write (Projects write for a Project)

## 2026-10-30 · [Ext] feat(ui): export dialog with live report preview
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-export.md
- Branch/PR: feat/ui-export
- What changed: Export button opens a dialog (period, date field, people, sub-tasks, format) with a live preview of the real report; save as HTML, Markdown or CSV in VS Code, download in the browser over `gitask serve`. The host validates the options and builds the report.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): sub-tasks in List, Board and detail
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-subtasks.md
- Branch/PR: feat/ui-subtasks
- What changed: Jira-style sub-tasks: expand a List row, a Sub-tasks toggle on Board cards, and a detail section to add, tick, assign, set the lane or split into backend / UX/UI / frontend. New validated messages `addSubtask`, `setSubtaskAssignee`, `setSubtaskLane`.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): assignee picker, avatars and People filter
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-assign.md
- Branch/PR: feat/ui-assign
- What changed: pick the Owner from the contributors in a searchable combobox (Board card and detail), avatars on Board, List and detail, and a People filter (with Unassigned) that also matches sub-task assignees. `setOwner` and `addPerson` are validated.
- Needs: none

## 2026-10-30 · [CLI] feat(serve): gitask serve, the UI in a browser
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-serve.md
- Branch/PR: feat/serve
- What changed: `gitask serve` opens the same UI in a browser on `127.0.0.1`, protected by a random token plus Host and Origin checks, the same message validation as VS Code, a body cap and a strict CSP. The UI is bundled into the CLI, so `npx gitask-cli serve` needs no other files.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): List, Timeline, Overview and task detail in React
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-views.md
- Branch/PR: feat/ui-views
- What changed: the three views and the task detail panel (react-markdown, no raw HTML) moved to `packages/ui` with shadcn; List keeps a chevron column and expandable row slot for sub-tasks. Removed the string-built views, `detail.ts`, `markdown.ts`, `webviewHtml` and the `GITASK: Open Classic Board` command.
- Needs: none

## 2026-10-30 · [Ext] feat(ui): React and shadcn UI foundation
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-ui-foundation.md
- Branch/PR: feat/ui-foundation
- What changed: new `packages/ui` (React, Vite, Tailwind, shadcn) behind a `Host` interface, with the shell and Board; the webview loads it under a strict CSP (nonce scripts) and follows the VS Code theme.
- Needs: none

## 2026-10-30 · [CLI] feat(cli): people, assign, subtask and report commands
- Owner: SNLRLONG
- Task: Tasks/5-done/CLI-commands.md
- Branch/PR: feat/cli-commands
- What changed: `gitask people`, `assign`, `subtask add|assign|list` and `report --format html|md|csv` with period, people and date-field options.
- Needs: none

## 2026-10-30 · [Core] feat(core): done report by person
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-done-report.md
- Branch/PR: feat/done-report
- What changed: report of what was done in a period, per person (tasks and sub-tasks done, on time vs late, average days, tier mix), as self-contained HTML, Markdown or CSV. Done date comes from the git move commit, falling back to `Updated`; GitHub names only, never emails.
- Needs: none

## 2026-10-30 · [Core] feat(core): sub-task assignee and lane
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-subtask-assignee.md
- Branch/PR: feat/subtask-assignee
- What changed: sub-task lines under `## Sub-tasks` accept `@person` and `#lane` tokens; `addSubtask`, `setSubtaskAssignee` and `setSubtaskLane` edit only that line. Card progress counts `Done when` and `Sub-tasks`.
- Needs: none

## 2026-10-30 · [Core] feat(core): people from git history
- Owner: SNLRLONG
- Task: Tasks/5-done/Core-people.md
- Branch/PR: feat/people
- What changed: contributors read from git history and `.mailmap`, merged with `people` in `Tasks/gitask.json` (stable id, name, GitHub name, role; emails never stored); `setOwner` writes the task Owner.
- Needs: none

## 2026-10-30 · [Ext] feat(ext): GITASK icon on the editor tab
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-tab-icon.md
- Branch/PR: feat/tab-icon
- What changed: the board tab shows the GITASK icon (light and dark).
- Needs: none

## 2026-10-21 · [Ext] feat(board): task ID, delete task or empty status
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-task-id-delete.md
- Branch/PR: feat/task-id-delete (released in v0.4.0)
- What changed: every task gets a short ID (`T-0001`, `- **ID:**` line), backfilled once for old tasks; shown on cards, list and detail and searchable. Delete a task (confirm, committed by pathspec) or an empty status from the board. Git calls now use literal pathspecs.
- Needs: none

## 2026-10-21 · [Ext] feat(views): show or hide statuses
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-status-show-hide.md
- Branch/PR: feat/status-show-hide (released in v0.4.0)
- What changed: chip bar to show or hide any status in Board, List, Timeline and Overview at once; kept per user in the webview, never committed.
- Needs: none

## 2026-10-21 · [Ext] feat(board): colour per status
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-status-color.md
- Branch/PR: feat/status-color (released in v0.4.0)
- What changed: set a colour per status from the board column header (stored in `Tasks/gitask.json`); shown on board, list, timeline and overview.
- Needs: none

## 2026-10-21 · [Ext] feat(views): date range filter
- Owner: SNLRLONG
- Task: Tasks/6-deploy/Ext-date-filter.md
- Branch/PR: feat/date-filter (released in v0.4.0)
- What changed: one From/To date filter (Due or Updated) on Board, List, Timeline and Overview, remembered per view; "No tasks in range." empty state.
- Needs: none

## 2026-10-18 · [Ext] feat: Ext-marketplace-metadata
- Owner: SNLRLONG
- Task: Tasks/5-done/Ext-marketplace-metadata.md
- Branch/PR: `fix/marketplace-metadata`
- What changed: The VS Code Marketplace rejects the 0.3.0 `.vsix` ("Your extension has suspicious content. Please fix your extension metadata"), so 0.3.0 is only on npm, Open VSX and GitHub, and VS Code users cannot auto-update. Find which metadata is flagged and ship 0.3.1 that the Marketplace accepts.

## 2026-10-18 · [Ext] fix: Ext-marketplace-metadata
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ext-marketplace-metadata.md
- Branch/PR: `fix/marketplace-metadata`
- What changed: The VS Code Marketplace rejected 0.3.0 with "suspicious content". Manual upload tests showed the code and README are fine and a keyword was flagged, so the `agents` keyword is removed. Version bumped to 0.3.1 (CLI and extension).
- Needs: manual upload of the `.vsix` on the Marketplace manage page (no `VSCE_PAT` secret yet)

## 2026-10-18 · [Ext] feat: Ext-init-tasks-folder
- Owner: SNLRLONG
- Task: Tasks/3-in-progress/Ext-init-tasks-folder.md
- Branch/PR: `feat/init-tasks-folder`
- What changed: New command **GITASK: Initialize Tasks Folder** creates the six status folders and a `_TEMPLATE.md` in a project with no `Tasks/`, then opens the board. Core gains `initTasks`. Version bumped to 0.3.0.
- Needs: none

## 2026-10-18 · [Ops] feat: Ops-web-redesign
- Owner: SNLRLONG
- Task: Tasks/5-done/Ops-web-redesign.md
- Branch/PR: `feat/web-redesign`
- What changed: Port the Figma Make landing page (`~/Downloads/Redesign GITASK Landing Page`) into Docusaurus. Docs keep the Docusaurus navbar/footer.

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
