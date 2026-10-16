---
name: docs-writer
description: Write or edit user-facing GITASK documentation on the website (packages/web/docs) and READMEs. Use for any docs page, CLI reference, task-format guide or tutorial. Keeps docs true to the product and in one place.
---

# Docs writer

User docs live in `packages/web/docs/` and nowhere else. `Docs/` is internal engineering notes: link to it, do not copy it. READMEs point to the site.

## Before writing
1. Read the code or run the product for every claim: build the CLI and run `gitask help`, run each command shown, open the extension for each screen described. Never document from memory or from a plan.
2. Check what is released: a feature in a plan or an open task is "coming soon", not described as working.

## Page shape
- Title says the task ("Move a task from the CLI"), not the feature name.
- First line: what the reader will be able to do. Then prerequisites, steps, expected result, and the next page.
- One idea per page. Steps are numbered, each one action. Commands in fenced blocks with the shell named; show the Windows PowerShell form when it differs.
- Show real output copied from a real run. Mark placeholders clearly.
- Short sentences, plain words, second person, present tense. Define a term the first time ("sub-task: a checkbox line in a task file").
- Admonitions only for real warnings (data loss, commits made for you).

## Structure
Getting started · Task format · CLI reference (every command, flag, exit code) · VS Code views (Board, Detail, List, Timeline, Overview) · Settings · FAQ and troubleshooting. Each page has `title`, `description` (used by SEO) and a stable slug; never rename a slug without a redirect.

## Checks before done
- Build has no broken links or anchors.
- Every command in the page was run; flags match the built CLI help.
- Screenshots are current and have alt text.
- Version-specific text names the version.
- The `seo-checklist` rows for title and description pass.
