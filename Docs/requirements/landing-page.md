# Landing page

Updated: 2026-10-17

Why: people should find GITASK on its own site and download it with one click, not dig through GitHub Releases.

## What the page must do
- Say what GITASK is in one screen: a Kanban for a plain-Markdown `Tasks/` folder, git as identity (see root `README.md`).
- Offer downloads for **macOS, Windows, Linux** and a **command line** route. The visitor's OS is detected and its button is the primary one; the others stay visible.
- Always point at the **latest release**; no version number is hard-coded in the page.
- Work without JavaScript for the basics (links to the Marketplace, Open VSX, npm and the releases page).

## What the downloads really are
GITASK ships two artifacts (`Docs/architecture/release.md`). Neither is a native OS installer.

| Button | Delivers | Install step shown beside it |
|---|---|---|
| Install in VS Code | `vscode:extension/vannseavlong.gitask-vscode` (Marketplace) | none |
| macOS / Windows / Linux | `gitask-vscode-X.Y.Z.vsix` from the latest GitHub Release (same file on all three) | `code --install-extension <file>` in that OS's terminal |
| Command line | npm package `gitask-cli` | `npm i -g gitask-cli` or `npx gitask-cli board`, needs Node 20+ |

Native per-OS binaries are not built yet (backlog: `Ops-web-later`).

## Brand
Superseded 2026-10-17: the visual redesign uses the LSDB look, dark by default with a light theme; see `web-redesign-brief.md`. The table below is the old portfolio palette.

Earlier decision: use the portfolio palette, which is the owner's personal brand. The LSDB landing is near-black monochrome (`#030213`); use it only if the owner prefers.

| Token | Value | Source |
|---|---|---|
| primary | `#3B82F6` | `VANN_Seavlong/tailwind.config.js` |
| secondary (hover) | `#1E40AF` | same |
| accent | `#F59E0B` | same |
| dark text | `#1F2937` | same |
| light surface | `#F9FAFB` | same |
| hero background | gradient `blue-50` to `indigo-100` | `src/components/Hero.tsx` |
| font | Inter 300 to 700 | `src/styles/globals.css` |
| buttons | `rounded-lg`, filled primary and outlined secondary | `.btn-primary`, `.btn-secondary` |

Tokens live in one CSS file in the site so a palette swap is a one-file change. Dark mode is out of scope for v1.
