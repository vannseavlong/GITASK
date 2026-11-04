# Manual testing: board, CLI and website

Unit tests cannot see a real VS Code webview, a real browser or the built site. Run this before every release (the `Ext-verify-in-vscode` task points here). It needs no F5: you install a test `.vsix` like a user would.

Run every command in the same terminal as your VS Code. With Windows VS Code and WSL, that is the WSL terminal; `code` then installs into your WSL window.

```bash
export REPO=~/Personal/GITASK      # the checkout you are testing
export TESTVER=0.6.0               # higher than the installed version, so the test build wins
```

## 1. Build and package

```bash
cd $REPO
pnpm install
pnpm build
cd packages/vscode
pnpm exec vsce package $TESTVER --no-dependencies --no-git-tag-version --no-update-package-json --out /tmp/gitask-test.vsix
```

`--no-update-package-json` leaves the repo's version alone, so `git status` stays clean. Set `TESTVER` above the version on the Marketplace, or VS Code keeps the one it has.

## 2. Make a throwaway project

```bash
mkdir ~/gitask-sandbox && cd ~/gitask-sandbox
git init -b main
node $REPO/packages/cli/dist/gitask.js init
node $REPO/packages/cli/dist/gitask.js new Web-login-page
node $REPO/packages/cli/dist/gitask.js new Api-auth 2-todo
git add -A && git commit -m init
```

Keep two small PNGs and one plain SVG handy for the logo checks. Delete the folder when done, or rerun the steps for a clean start.

## 3. Install into VS Code

```bash
code --install-extension /tmp/gitask-test.vsix --force
code ~/gitask-sandbox
```

In VS Code run **Developer: Reload Window**, then open the board with the GITASK command from the palette. To go back, uninstall it in the Extensions panel and reinstall from the Marketplace.

## 4. Checklist: VS Code board

- **Create**
  - New task from the board: the board stays, the new card appears and its detail panel opens. No raw `.md` opens.
  - `GITASK: New Task` from the palette with the board closed: the board is revealed, no file opens.
  - A duplicate id shows an error and the board stays as it was.
  - The "Open file" action in the notice opens the `.md`.
- **Move:** drag a card to another column; `git log` shows a move commit and the UI resyncs. With `gitask.autoCommit` off, it moves without a commit. In a folder that is not a git repo, it still moves.
- **Delete** (task, empty status, sub-task)
  - The in-app dialog shows the impact text. Esc cancels and focus returns to where it was.
  - Check light, dark and high-contrast themes.
  - A task that is tracked by git says it can be restored from history.
- **Tabs**
  - Overview is the first tab on a fresh install.
  - Dragging a tab reorders it and does not switch the view. Alt+Left and Alt+Right move a focused tab. Reset tab order restores the default.
  - The order survives Reload Window.
- **Project header** (the kebab menu in the header corner has "Customize header"; with no project, the quiet "Add project header" action)
  - Title, subtitle, every alignment, size and logo position. The logo area works by drop, by click, and by Enter or Space; a bad file shows its reason inside the area. The preview matches the real header.
  - A PNG upload shows in the header on all four views and `Tasks/` gets one `logo-<hash>.png`. `git log` shows one commit with `gitask.json` and that file only.
  - Replacing the logo deletes the old `logo-*` file in the same commit. A hand-named file in `Tasks/` is never deleted.
  - Refused with a clear message in the dialog (draft stays open): a text file renamed `.png`, an SVG with a script, a file over 1 MiB.
  - Save with no changes makes no commit. Remove logo clears it. A broken or missing logo file leaves the title only, no broken-image icon.
  - Narrow editor width: the header wraps and stays readable.
- **Export:** HTML and Markdown reports start with the project header (the logo is in the HTML, and in the preview). The "Include project header" box turns it off.
- **Other:** edit a task from the kebab menu, assign an owner, toggle a sub-task checkbox, set a status colour.

## 5. Checklist: CLI and browser board

```bash
cd ~/gitask-sandbox
node $REPO/packages/cli/dist/gitask.js serve --no-open
```

Open the printed URL (it contains the access token). Repeat the Create, Delete, Tabs and Project header checks from section 4 in the browser, in Chrome and in Firefox. Firefox is where tab dragging used to fail.

- A bare delete without the dialog is refused (the dialog is the only way to confirm).
- Reload the page: the tab order and the logo are still there.
- Without the token in the URL, the page and `/api/logo` answer 401.

CLI commands:

```bash
node $REPO/packages/cli/dist/gitask.js board
node $REPO/packages/cli/dist/gitask.js move Web-login-page 3-in-progress
node $REPO/packages/cli/dist/gitask.js report --format md
node $REPO/packages/cli/dist/gitask.js report --format html --out /tmp/r.html
```

Open `/tmp/r.html`: the header and logo show, and the page runs no script. Stop the server with Ctrl+C.

## 6. Checklist: website

```bash
cd $REPO
pnpm --filter gitask-web build
pnpm --filter gitask-web serve
```

- The VS Code Marketplace button is in the hero, the navbar (and the mobile menu) and the install section. There are no per-OS cards.
- Light and dark theme; phone width (about 390 px) and desktop; no horizontal scroll.
- The CLI list in "What's new" looks right.
- Run Lighthouse on `/` (mobile): Accessibility 100 and no regression elsewhere.

## 7. Report

Write what failed with a screenshot, as a note in `Tasks/_inbox/<task>/` or in the task file. Fix, rebuild the `.vsix`, and repeat only the failed section.
