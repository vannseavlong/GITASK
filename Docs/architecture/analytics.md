# Website analytics

`packages/web` reports visits and a few actions to Google Analytics 4, which is the Analytics in Firebase project `longcelot-eco-system` (web app `gitask-web`). The website is the only part of GITASK that tracks anything; the extension and the CLI send nothing.

## How it is wired

| Piece | File | Job |
|---|---|---|
| Plugin | `packages/web/src/analytics/plugin.ts` | Production builds only. Adds one inline head script: if `location.hostname` is the `SITE_URL` host, it starts gtag and loads `gtag.js`; on any other host it does nothing. |
| Client module | `packages/web/src/analytics/client.ts` | `page_view` on route change; one capturing `click` and one `input` listener on `document`. |
| Rules | `packages/web/src/analytics/events.ts` | Decides what is sent and cleans every value. No DOM; tested in `packages/web/test/analytics.test.ts`. |
| Send | `packages/web/src/analytics/track.ts` | `track(name, params)`: no-op when gtag is missing (analytics off, other host, ad blocker); never throws. |
| ID | `GA_MEASUREMENT_ID` in `packages/web/docusaurus.config.ts` | Public `G-…` id. Empty turns analytics off. Validated before it goes into the inline script. |

Nothing is sent from `docusaurus start`, a local `serve`, the `staging` preview channel or a fork, because their hostname is not the `SITE_URL` host. When `SITE_URL` moves to a custom domain, tracking follows it.

## Events

| Event | When | Parameters |
|---|---|---|
| `page_view` | First load (from `gtag('config')`) and each route change to a new path or query. `#section` jumps are not page views. | `page_location` (origin + path only), `page_title` |
| `cta_click` | A link styled as `.button` | `cta_text`, `link_url` (path + `#anchor`, or the cleaned external URL), `section`, `outbound` |
| `outbound_click` | Any link to another host | `link_domain`, `link_url`, `link_text`, `section` |
| `download_vsix` | A GitHub release `.vsix` link | `file_name`, `section` |
| `copy_command` | A landing-page copy button (`CopyButton`) | `command` (the site's own fixed text) |
| `copy_code` | A docs code-block copy button | `language` |
| `search` | Navbar search after 1.2 s without typing (each term once), or opening `/search?q=` | `search_term`, `search_location` (`navbar` or `search_page`), `has_results` (navbar only) |

`section` is the landing section id (`download`, `features`, …), `hero`, `final_cta`, `navbar`, `footer`, `doc` or `page`. A button to another host sends both `cta_click` and `outbound_click`.

## Privacy rules

- No cookie banner (owner's choice), so Google signals and ad personalisation are off in `gtag('config')`.
- No URL query strings or hashes are sent; text is trimmed, emails and runs of 6+ digits are replaced with `[email]` / `[number]`, and every value is capped at 100 characters (`cleanText`, `cleanUrl`).
- Only `http(s)` links are counted; `javascript:` and `mailto:` links are ignored.
- Nothing identifies a visitor beyond what gtag itself collects. Never add user input other than the search term, and never add ids, emails or tokens to events.

## GA4 settings (owner, once)

In Firebase Console > Project settings > Integrations > Google Analytics > the `gitask-web` stream > Enhanced measurement:
- Turn **off** "Page changes based on browser history events": the client module sends route changes itself, with the correct title; leaving it on counts them twice.
- Leave the rest on. Enhanced "outbound clicks" and "site search" use different event names (`click`, `view_search_results`), so they do not double count ours.
- Data retention: the shortest that suits you (2 months is the default).

## Checking it

`pnpm --filter gitask-web test` covers the rules. To see events on a real build, set a test id, `pnpm --filter gitask-web build`, serve it, and map `gitask-me.web.app` to the local server (for example a Playwright route); `window.dataLayer` shows every call. In production use GA4 DebugView or Realtime.
