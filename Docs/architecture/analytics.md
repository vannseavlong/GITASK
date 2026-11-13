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
| `page_view` | First load (from `gtag('config')`) and each route change to a new path or query. `#section` jumps are not page views. Each change first runs `gtag('set')`, so later events on that page report the right page. | `page_location` (origin + path only), `page_title` (`Search` on `/search`, whose real title contains the query), `page_referrer` (origin + path only, first load) |
| `cta_click` | A link styled as `.button` | `cta_text`, `link_url` (path + `#anchor`, or the cleaned external URL), `section`, `outbound` |
| `outbound_click` | Any link to another host | `link_domain`, `link_url`, `link_text`, `section` |
| `download_vsix` | A GitHub release `.vsix` link | `file_name`, `section` |
| `copy_command` | A landing-page copy button (`CopyButton`) | `command` (the site's own fixed text) |
| `copy_code` | A docs code-block copy button | `language` |
| `search` | Navbar search after 1.2 s without typing, or opening `/search?q=`; pressing Enter on a term just sent does not send it again | `search_term`, `search_location` (`navbar` or `search_page`), `has_results` (navbar only) |

`section` is the landing section id (`download`, `features`, …), `hero`, `final_cta`, `navbar`, `footer`, `doc` or `page`. A button to another host sends both `cta_click` and `outbound_click`.

## Privacy rules

- No cookie banner (owner's choice), so Google signals and ad personalisation are off in `gtag('config')`.
- No URL query strings or hashes are sent by our code; text is trimmed, emails become `[email]`, runs of 6+ digits `[number]` (dates too, accepted) and runs of 20+ word characters (API keys, tokens, hashes) `[token]`, and every value is capped at 100 characters (`cleanText`, `cleanUrl`).
- Only `http(s)` links are counted; `javascript:` and `mailto:` links are ignored.
- Nothing identifies a visitor beyond what gtag itself collects. Never add user input other than the search term, and never add ids, emails or tokens to events.

## GA4 settings (owner, once)

Google Analytics > Admin > Data streams > `gitask-web` > Enhanced measurement. Keep only **Page views** (and Scrolls if wanted); turn the rest off:
- "Page changes based on browser history events" (inside Page views > Show advanced settings): the client module sends route changes itself, with the right title; left on, they count twice.
- Outbound clicks, File downloads, Site search, Form interactions, Video engagement: ours cover these, and Google's versions send raw URLs and link text (query strings included), which breaks the privacy rules above. Outbound clicks would also count the same clicks again as `click`.

Admin > Data collection: leave Google signals off and turn off "granular location and device data". Admin > Data retention: 2 months.

Admin > Custom definitions > Create custom dimension (event scope), or the parameters will not show in reports: `section`, `cta_text`, `link_url`, `link_domain`, `link_text`, `outbound`, `file_name`, `command`, `language`, `search_location`, `has_results`. (`search_term` is built in.)

## Consent and compliance

GA4 sets first-party `_ga` cookies. The owner chose no consent banner. Turning off signals and ad personalisation lowers the risk, but in the EU/UK non-essential analytics cookies still normally need prior consent (ePrivacy). If that audience matters, add Consent Mode with `analytics_storage: 'denied'` by default and a banner. Google's terms require a privacy notice on the site that says Google Analytics is used. This is a summary of the reviewers' notes, not legal advice.

## Later hardening

- A Content-Security-Policy in `firebase.json`: `script-src 'self' 'sha256-<inline hashes>' https://www.googletagmanager.com`, `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`, `img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com`, plus what Docusaurus's own inline theme script needs; and `Referrer-Policy: strict-origin-when-cross-origin`. Hosting change, so a T3 task.
- gtag.js is loaded without SRI on purpose: Google changes the file without notice.

## Checking it

`pnpm --filter gitask-web test` covers the rules. To see events on a real build, set a test id, `pnpm --filter gitask-web build`, serve it, and map `gitask-me.web.app` to the local server (for example a Playwright route); `window.dataLayer` shows every call. In production use GA4 DebugView or Realtime.
