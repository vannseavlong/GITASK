---
name: launch-checklist
description: Make GITASK easy to find and worth installing. Use before a release or when touching the Marketplace/Open VSX listing, npm package metadata, README, GitHub repo settings or any launch or announcement material. Prepares content; the owner publishes and posts.
---

# Launch and listing checklist

Agents prepare the text and assets and report gaps. The owner owns accounts, publishing, posting and anything outward-facing (see `AGENTS.md`). Do not post, publish, tag, or change repo settings.

## VS Code Marketplace and Open VSX (`packages/vscode`)
- `displayName` and `description` say the outcome in one line, with the search terms "Kanban", "Markdown", "tasks", "git".
- `categories` and `keywords` set deliberately (at most 5 keywords count); `icon` is 128x128 PNG; `galleryBanner` colour matches the brand primary.
- README is the listing page: one-line pitch, a 10 to 15 second GIF of drag, detail and timeline, install in two steps, features with screenshots, settings table, link to the site and docs, issue tracker link. No relative image paths that break on the store (use absolute URLs).
- `repository`, `bugs`, `homepage`, `license` and `publisher` are present and match the real repo and site.
- Screenshots use a clean demo workspace, a light and a dark theme, no personal data.
- `CHANGELOG` entry exists for the version being released.

## npm (`packages/cli`)
- `description` and `keywords` match the listing words; `bin`, `engines`, `files`, `repository`, `homepage`, `bugs` correct.
- README has the one-line pitch, install, three commands with real output, link to docs.
- `npm pack --dry-run` shows only intended files.

## GitHub
Prepare for the owner: description, topics (`kanban`, `markdown`, `git`, `vscode-extension`, `cli`, `task-management`), social preview image 1280x640, pinned README sections, issue templates, a `CONTRIBUTING.md`, "good first issue" labels, release notes written for users.

## Website
Run the `seo-checklist` skill. The home page links Marketplace, Open VSX, npm and GitHub, and the docs link back to the home page.

## Announcement drafts (text only)
Short post, longer write-up, and a Show HN style title. Each states what it is, who it is for, what is not done yet, and one link. Lead with the problem and a GIF. No claims that cannot be checked (users, stars, speed). Put drafts in `Tasks/_inbox` or the task file for the owner, never post them.

## Output
A table of rows with done, missing or n/a, then a list of owner actions in order.
