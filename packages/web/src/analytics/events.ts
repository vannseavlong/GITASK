// Pure helpers for website analytics: no DOM, no imports, so node:test can run them.
// Everything sent to Google Analytics goes through these, so this file is the privacy boundary.

/** GA4 keeps at most 100 characters of a custom event parameter. */
export const MAX_PARAM_LENGTH = 100

export type EventParams = Record<string, string | number | boolean>
export type AnalyticsEvent = { name: string; params: EventParams }

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
// 20+ word characters in a row: API keys, tokens (ghp_…, sk-…), JWT parts, hashes.
const TOKEN = /[A-Za-z0-9_-]{20,}/g
// 6+ digits in a row (phone numbers, ids, card-like numbers), allowing spaces and dashes inside.
// Dates such as 2026-11-13 are caught too; that is accepted.
const LONG_NUMBER = /\d(?:[\s-]?\d){5,}/g

/** Trim, collapse whitespace, redact emails and long numbers, cap the length. */
export function cleanText(value: string | null | undefined, max = MAX_PARAM_LENGTH): string {
  if (!value) return ""
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(EMAIL, "[email]")
    .replace(TOKEN, "[token]")
    .replace(LONG_NUMBER, "[number]")
    .slice(0, max)
}

/** Origin and path only: query strings and hashes can carry tokens or personal data. */
export function cleanUrl(href: string, base: string): string | null {
  let url: URL
  try {
    url = new URL(href, base)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  return `${url.origin}${url.pathname}`.slice(0, MAX_PARAM_LENGTH)
}

export type LinkClick = {
  href: string
  /** Current page URL, used to resolve relative links and tell internal from external. */
  pageUrl: string
  text: string
  /** The link is styled as a button (a call to action). */
  isButton: boolean
  /** Landing section id or page area: "download", "hero", "navbar", "footer", "doc". */
  section: string
}

const VSIX = /\/releases\/download\/[^/]+\/([^/]+\.vsix)$/

/** Turn one link click into the events to send. Returns [] for links not worth counting. */
export function eventsForLink(click: LinkClick): AnalyticsEvent[] {
  const target = cleanUrl(click.href, click.pageUrl)
  if (!target) return []
  const page = new URL(click.pageUrl)
  const url = new URL(target)
  const external = url.host !== page.host
  const text = cleanText(click.text)
  const section = cleanText(click.section, 40) || "page"
  const events: AnalyticsEvent[] = []

  const vsix = external ? VSIX.exec(url.pathname) : null
  if (vsix) {
    events.push({ name: "download_vsix", params: { file_name: cleanText(vsix[1]), section } })
  }
  if (click.isButton) {
    events.push({
      name: "cta_click",
      params: {
        cta_text: text,
        link_url: external ? target : (url.pathname + hashOf(click.href)).slice(0, MAX_PARAM_LENGTH),
        section,
        outbound: external,
      },
    })
  }
  if (external) {
    events.push({ name: "outbound_click", params: { link_domain: url.hostname, link_url: target, link_text: text, section } })
  }
  return events
}

// Keep in-page anchors such as "#download" for CTAs: they say where the button sends people.
function hashOf(href: string): string {
  const i = href.indexOf("#")
  if (i < 0) return ""
  return cleanText(href.slice(i), 40)
}

/** Visible text of a link, or its aria-label for icon-only links. */
export function linkText(textContent: string | null | undefined, ariaLabel: string | null | undefined): string {
  return cleanText(textContent) || cleanText(ariaLabel)
}

/** The search page puts the query in its title ("Search results for …"), so it gets a fixed title. */
export function pageTitle(pathname: string, title: string): string {
  return /^\/search\/?$/.test(pathname) ? "Search" : cleanText(title, 300)
}

/** Origin and path of the referrer, or "" when there is none. */
export function cleanReferrer(referrer: string): string {
  if (!referrer) return ""
  return cleanUrl(referrer, referrer) ?? ""
}

/** A docs or navbar search worth sending: at least 2 characters after cleaning. */
export function searchEvent(term: string, where: "navbar" | "search_page", hasResults?: boolean): AnalyticsEvent | null {
  const searchTerm = cleanText(term).toLowerCase()
  if (searchTerm.length < 2) return null
  const params: EventParams = { search_term: searchTerm, search_location: where }
  if (hasResults !== undefined) params.has_results = hasResults
  return { name: "search", params }
}

/** Route changes worth a page_view: a new path or query, not an in-page "#section" jump. */
export function isNewPage(
  next: { pathname: string; search: string },
  prev: { pathname: string; search: string } | null | undefined,
): boolean {
  if (!prev) return false // the first view is sent by gtag('config') on load
  return next.pathname !== prev.pathname || next.search !== prev.search
}
