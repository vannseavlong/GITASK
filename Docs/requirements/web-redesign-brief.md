# GITASK website redesign brief (for Figma Make)

Updated: 2026-10-17

Paste this whole file into Figma Make. It replaces the current look of the landing page, which is plain and weak in dark mode. Content and structure stay; the visual design is rebuilt.

## 1. What you are building
The marketing landing page for **GITASK**, a Kanban board for a plain-Markdown `Tasks/` folder. One Markdown file per task, the folder is the status, git is the history. It ships as a VS Code extension and a CLI. Free, open source, no account, no server.

Audience: developers and people who run projects with coding agents. They judge a tool by how its site looks. It must feel like a developer tool: calm, dark, precise, no marketing fluff.

## 2. Deliverable (read this, it decides what we can reuse)
- **Landing page only**: one route, `/`. Docs stay in Docusaurus and are NOT part of this build.
- React + TypeScript + Tailwind, Vite, as Figma Make produces. We will port the sections into our Docusaurus site, so:
  - one component per section, in `src/app/components/`, each self-contained and props-driven;
  - **all colors, radii, fonts as CSS variables in one file** (`src/styles/theme.css`), no hard-coded hex inside components;
  - no router, no backend calls, no analytics, no external UI kit beyond Tailwind and `lucide-react` icons;
  - content in one `content.ts` (headlines, features, views, steps, links) so copy edits never touch layout.
- **Dark mode is the default and the hero of the design.** Light mode must also work, with a theme toggle in the navbar. Both are designed, not auto-inverted.
- Responsive and checked at **360, 768, 1280** wide. No horizontal scroll at 360.
- Accessible: text contrast at least 4.5:1 in both themes, visible keyboard focus, real `<button>`/`<a>`, `prefers-reduced-motion` respected, images have alt text.

## 3. Brand: same as the LSDB (SheetDB) site
LSDB is a near-black developer look: gray-950 page, gray-900 cards with a gray-800 border, blue accent, VS Code editor colors for code. GITASK shares it so the two products read as one family. (This replaces the earlier "portfolio palette" decision.)

### Colors (define as CSS variables, names below)
| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#030712` | `#ffffff` | page |
| `--bg-nav` | `rgba(3,7,18,0.8)` + blur | `rgba(255,255,255,0.8)` + blur | sticky navbar |
| `--surface` | `#111827` | `#f9fafb` | cards, panels |
| `--surface-2` | `#1f2937` | `#f3f4f6` | hover, inputs, column headers |
| `--border` | `#1f2937` | `#e5e7eb` | card and section borders |
| `--border-strong` | `#374151` | `#d1d5db` | inputs, dividers |
| `--text` | `#ffffff` | `#111827` | headings |
| `--text-body` | `#d1d5db` | `#374151` | paragraphs |
| `--text-muted` | `#9ca3af` | `#6b7280` | captions, labels |
| `--accent` | `#60a5fa` | `#2563eb` | links, icons, active states |
| `--primary` | `#3b82f6` | `#2563eb` | primary button fill |
| `--primary-hover` | `#2563eb` | `#1d4ed8` | primary button hover |
| `--accent-soft` | `rgba(59,130,246,0.10)` | `rgba(37,99,235,0.08)` | icon tile background |
| `--accent-soft-hover` | `rgba(59,130,246,0.20)` | `rgba(37,99,235,0.14)` | icon tile hover |
| `--accent-border-hover` | `rgba(59,130,246,0.50)` | `rgba(37,99,235,0.50)` | card hover border |
| `--success` | `#4ade80` | `#16a34a` | "done", live status |
| `--warning` | `#f59e0b` | `#d97706` | T3 tier, "coming soon" badge |
| `--gradient-text` | `linear-gradient(to right, #3b82f6, #1e40af)` | same | big numbers and one hero word only |

Rules: one accent (blue). No purple/pink gradients, no glow orbs, no rainbow. Gradient only on text as above and on one soft radial blue wash behind the hero (opacity under 12%).

### Code and terminal blocks (identical in both themes, VS Code Dark+)
Terminal body `#1e1e1e`, title bar `#252526`, border `#323233`. Traffic-light dots `#ff5f56` `#ffbd2e` `#27c93f`.
Syntax: comment `#6a9955`, string `#ce9178`, keyword `#569cd6`, type/class `#4ec9b0`, variable `#9cdcfe`, control `#c586c0`, function `#dcdcaa`, error `#f48771`.

### Typography
- Font: **Inter** (300 to 700) for UI and headings; a system monospace stack for code (`ui-monospace, SFMono-Regular, Menlo, Consolas`).
- H1 clamp 40 to 64 px, weight 700, tight tracking. H2 30 to 36 px, weight 600. Body 16 px / 1.6. Caption 13 px.
- Minimum text size 13 px.

### Shape and spacing
Radius: cards `12px`, buttons `8px`, pills full. Borders 1 px. Card padding 24 px. Section vertical padding 96 px desktop, 64 px mobile. Content max width 1152 px, 16 px side gutter on mobile.

### Components
- **Primary button**: `--primary` fill, white text, 8 px radius, 12 x 24 px padding, hover `--primary-hover`, focus ring 2 px `--accent` with 2 px offset.
- **Secondary button**: transparent, 1 px `--border-strong`, `--text` text, hover `--surface-2`.
- **Card**: `--surface`, 1 px `--border`, 12 px radius; hover border `--accent-border-hover`, 200 ms.
- **Icon tile**: 40 px square, 8 px radius, `--accent-soft` background, `--accent` icon (lucide, 20 px).
- **Badge**: pill, 12 px text; "Coming soon" uses `--warning` text on a 12% warning tint; tier chips T0 to T3 use neutral, blue, amber, red-tinted.
- **Copy button** on every code block: icon button top right, shows "Copied" for 1.5 s.

## 4. Page structure (top to bottom)
Keep this order and this copy. Real copy is final; placeholders are marked.

1. **Navbar** (sticky, blurred, bottom border): logo (the icon in `/static/img/icon.png` plus wordmark "GITASK"), links Features, Views, How it works, Download, Docs; GitHub icon link; theme toggle; primary button "Download". Collapses to a menu under 768 px.
2. **Hero**: two columns on desktop, stacked on mobile.
   - Left: small pill "Free and open source". H1 **"Kanban for your Tasks folder."** (the words "Tasks folder" in `--gradient-text`). Lead: *One Markdown file per task, the folder is the status, git is the history. In VS Code and on the command line.* Buttons: **Download** (primary, scrolls to #download) and **Read the docs** (secondary, `/docs/intro`). Under the buttons a muted line: *VS Code 1.9x+ · Node 20+ for the CLI · macOS, Windows, Linux*.
   - Right: a VS Code window mockup (title bar dots, a sidebar with a `Tasks/` tree, a Kanban board with three columns **Todo / In progress / Done** and 5 cards: `Web-login-page` T2, `Core-export` T1, `Ops-publish-prep` T3, `CLI-gitask` T1, `Core-changelog` T1; each card has owner avatar initials, a tier chip and a progress bar like `3/5`). One card is shown mid-drag with a slight tilt and shadow. Label it "Illustration" in small muted text until a real screenshot exists. Must look good in both themes.
3. **Why GITASK** (4 cards): Folder is the status, "Drag a card and GITASK runs git mv. There is no status field to drift out of date." · Git is the history, "Each move commits that one task file. No accounts, no server, no database." · Made for people and agents, "Plain Markdown that humans and coding agents read and write with the same rules." · VS Code and a CLI, "The board in your editor, and gitask board, move, new and changelog in any terminal." Each with a lucide icon (`folder-kanban`, `git-commit-horizontal`, `bot`, `terminal`).
4. **How it works** (3 steps, numbered, connected by a thin line): 1 Keep tasks as files, "`Tasks/2-todo/Web-login-page.md` is a task. Its folder is its status." with a small file-tree illustration. 2 Move a card, "GITASK runs git mv, updates the date and commits that file only." 3 Read the history, "Every move is a commit. Share the board by pushing the repo." with a `git log --oneline` terminal snippet (use the Dark+ colors).
5. **Every way to see your work** (views): five cards. **Board** (live), **Task detail**, **List**, **Timeline**, **Overview** (these four carry the "Coming soon" badge). Descriptions: Board "Columns from your numbered folders, drag to move." · Task detail "Read a task rendered, tick its sub-tasks." · List "Sort, filter and search every task in a table." · Timeline "Calendar and waterfall with dependencies." · Overview "Counts, stale tasks, overdue and recent moves." Each card shows a small abstract thumbnail of the view (drawn, not a screenshot). Board is highlighted.
6. **Command line**: a terminal mockup (Dark+) showing `gitask board`, `gitask move Web-login-page 3-in-progress`, `gitask new Core-export`, `gitask changelog` with plausible output (a text board). Left side: heading "Same board, no editor needed", 3 bullet points, copy button on the install line `npm i -g gitask-cli`.
7. **Download** (`id="download"`): heading "Download GITASK". Three OS cards (macOS, Windows, Linux) plus a Command line card, in a row on desktop. The visitor's OS card is highlighted (primary button, "Recommended" pill); the others use the secondary button. Each OS card: OS icon, "GITASK for macOS", button "Download .vsix", and under it the install command with a copy button: `code --install-extension gitask-vscode-<version>.vsix`. A full-width strip above: **Install in VS Code** (button, one click from the Marketplace). The Command line card: tabs `npm i -g gitask-cli` and `npx gitask-cli board`, note "Needs Node 20+". **Do not hard-code a version number**; show `<version>` as a placeholder and a skeleton loading state, an error state ("Could not reach GitHub, use the releases page" with a link). Design all four states: loading, ready, error, no-JS.
8. **Final call to action**: a wide card with a blue wash, "Your tasks are already files. Give them a board." and the two buttons again.
9. **Footer**: logo, one-line description, columns Product (Features, Views, Download), Docs (Getting started, Task format, CLI reference), Community (GitHub, Issues, Marketplace, npm), a line "MIT licensed". Top border `--border`, bottom row with copyright.

## 5. Motion
Subtle only: 200 ms hover transitions, fade-up on scroll (12 px, once), the dragged card gently floats. No parallax, no autoplay video. All off under `prefers-reduced-motion`.

## 6. Do not
- No stock photos, no emoji as icons, no fake testimonials, no fake download counts or GitHub stars.
- No light-only or dark-only shortcuts: every section designed in both themes.
- No version numbers, dates or prices in the copy.
- No extra sections or pages beyond this list.

## 7. Done when
- Both themes look intentional at 360, 768 and 1280 px.
- Colors only come from the variables in `theme.css`; swapping the palette is a one-file change.
- Each section is its own component and takes its text from `content.ts`.
- Download section shows all four states.
