---
name: seo-checklist
description: Run an SEO and shareability checklist on the GITASK website (packages/web) before it moves to testing or deploy. Use for any change to pages, docs, metadata, images or the Docusaurus config that affects how the site is found, previewed or ranked.
---

# SEO checklist

Run against the **built** site (`pnpm --filter gitask-web build`, then serve it), not the dev server. Paste the result table in the PR. Mark each row pass, fail or n/a with a reason. Never mark a row you did not check.

## Per page
| Check | Rule |
|---|---|
| Title | Unique, under about 60 characters, starts with the page topic, brand last |
| Description | Unique, 70 to 160 characters, says what the reader gets |
| One `h1` | Matches the title's intent; headings nest without skipping levels |
| Canonical | Absolute URL from the one `url` config value; no trailing-slash duplicates |
| Open Graph / Twitter | `og:title`, `og:description`, `og:image` (1200x630, real product, under 1 MB), `twitter:card=summary_large_image` |
| Images | Meaningful `alt`, width and height set, WebP or SVG, below-the-fold lazy, hero not lazy |
| Links | Descriptive text (not "click here"); no broken internal links (the build reports them) |
| No `noindex` | Only on pages that must stay private |

## Site wide
- `sitemap.xml` is generated and lists every public page; `robots.txt` allows crawling and names the sitemap.
- `SoftwareApplication` JSON-LD on the home page: name, description, `applicationCategory` DeveloperApplication, `operatingSystem`, `offers` price 0, `url`, `downloadUrl`. Only values that are true today. Validate with the schema.org validator or Google's Rich Results test.
- Favicon set, web manifest, `theme-color` from the brand primary.
- HTTPS only; one canonical host (no duplicate on `www` or `*.firebaseapp.com`: add a redirect or canonical).
- 404 page exists, returns status 404, and links home.
- Cache headers: long for hashed assets, short for HTML.

## Performance and accessibility (Lighthouse, mobile profile)
Targets: SEO 100, Accessibility 95+, Best practices 95+, Performance 90+. Report the real numbers and the URL tested. Check LCP image preloaded, no layout shift from fonts (`font-display: swap`), contrast of primary buttons at least 4.5:1.

## Content
- Keywords people actually search, used naturally in titles and headings: "Kanban for Markdown tasks", "git-based task board", "VS Code Kanban", "Tasks folder". Do not stuff.
- Each docs page answers one question and links to the next step.
- Claims are true and current (versions, OS support, commands). Copy that disagrees with the product is a fail.

## Off-page (list, do not do without the owner)
Marketplace and Open VSX listing text, npm keywords and README, GitHub repo description, topics and social preview image. See the `launch-checklist` skill.

## Output
A table of rows with pass, fail or n/a, the Lighthouse numbers, and a short list of fixes made. Fix what is in scope; list the rest as findings.
