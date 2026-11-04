# Ext-verify-in-vscode

- **ID:** T-0005
- **Repo:** GITASK
- **Owner:** SNLRLONG
- **Tier:** T1 · manual check
- **Claimed by:** none
- **Worktree:** `GITASK/GITASK-verify-in-vscode/` · **Branch:** `fix/verify-in-vscode`
- **Started / updated:** 2026-11-03 / 2026-11-02
- **Due:** 2026-11-04
- **Docs:** `Docs/architecture/ui.md`
- **Depends on:** Ext-project-layout-settings, Ext-view-tabs-polish (everything in the UX wave must be merged)
- **Touches:** `packages/vscode/**` (fixes found only)

## Goal
Run the extension (F5 on packages/vscode) and `gitask serve` on a workspace with Tasks/, and walk through everything shipped in the UX wave. Nothing in it has been seen in a real VS Code webview or browser yet; only unit tests and headless screenshots back it. Fix bugs found, then move Ext-webview-board to 5-done.

## Gates (copy the rows your tier needs; write `Skipped Gn: reason` if you skip one)
- [ ] G1 scope  - [ ] G2 static  - [ ] G3 tests  - [ ] G4 run it
- [ ] G5 code review  - [ ] G6 security  - [ ] G7 docs sync
- [ ] G8 PR message  - [ ] G9 human review  - [ ] G10 release plan  - [ ] G11 changelog

## Done when
- [ ] Drag moves a file and commits (check git log); autocommit off and a non-git folder behave
- [ ] New task from the board and from `GITASK: New Task` (board closed): board stays, new card appears, detail panel opens, no raw `.md`; duplicate id shows an error; "Open file" works
- [ ] Delete a task, an empty status and a sub-task: in-app dialog (Esc cancels, focus returns, light/dark/high contrast); a bare delete message is refused
- [ ] Tabs open Overview first; drag a tab and Alt+Arrow reorder it without switching view; order survives reload in VS Code and in `gitask serve`; Reset works; Firefox path works in `serve`
- [ ] Project header: set title, subtitle, logo and every layout option from "Customize header"; shows on all four views; bad or missing logo falls back to text; no header when no project
- [ ] Export: HTML and Markdown reports carry the header (preview and file), toggle works
- [ ] Landing page (built site): Marketplace links in hero, navbar and install section, light and dark, mobile width; Lighthouse accessibility on `/`
- [ ] Ext-webview-board moved to 5-done

## How to run it (no F5 needed)
1. From the repo root: `pnpm install && pnpm build`.
2. Build a test .vsix with a version higher than the published one, without touching `package.json`:
   `cd packages/vscode && pnpm exec vsce package 0.6.0 --no-dependencies --no-git-tag-version --no-update-package-json --out /tmp/gitask-0.6.0-test.vsix`
3. Make a throwaway workspace: `mkdir ~/gitask-sandbox && cd ~/gitask-sandbox && git init -b main && node <repo>/packages/cli/dist/gitask.js init && node <repo>/packages/cli/dist/gitask.js new Web-login-page && git add -A && git commit -m init`.
4. Install: `code --install-extension /tmp/gitask-0.6.0-test.vsix --force`, then in VS Code run "Developer: Reload Window" and open the sandbox folder. Uninstall afterwards to go back to the Marketplace version.
5. CLI and browser board: `node <repo>/packages/cli/dist/gitask.js serve --no-open` and open the printed URL (it contains the access token).
6. Website: `pnpm --filter gitask-web build && pnpm --filter gitask-web serve`.
Then walk through "Done when" above.
