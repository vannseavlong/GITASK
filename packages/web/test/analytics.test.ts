import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MAX_PARAM_LENGTH,
  cleanText,
  cleanUrl,
  eventsForLink,
  cleanReferrer,
  isNewPage,
  linkText,
  pageTitle,
  searchEvent,
} from "../src/analytics/events.ts"
import { headScript, isValidMeasurementId } from "../src/analytics/plugin.ts"
import { setPage, track } from "../src/analytics/track.ts"

const PAGE = "https://gitask-me.web.app/"

test("cleanText trims, redacts emails and long numbers, and caps length", () => {
  assert.equal(cleanText("  npm   i -g\ngitask-cli "), "npm i -g gitask-cli")
  assert.equal(cleanText("mail me at sam.lee@example.com please"), "mail me at [email] please")
  assert.equal(cleanText("call 012 345 678 now"), "call [number] now")
  assert.equal(cleanText("card 4111-1111-1111-1111"), "card [number]")
  assert.equal(cleanText("version 0.6.1 and 12345"), "version 0.6.1 and 12345")
  assert.equal(cleanText("ab ".repeat(200)).length, MAX_PARAM_LENGTH)
  assert.equal(cleanText(undefined), "")
  assert.equal(cleanText(null), "")
  assert.equal(cleanText("token ghp_abcdefghijklmnopqrstuvwxyz123"), "token [token]")
  assert.equal(cleanText("key sk-proj-AbCdEfGhIjKlMnOpQrStUv"), "key [token]")
  assert.equal(cleanText("code --install-extension vannseavlong.gitask-vscode"), "code --install-extension vannseavlong.gitask-vscode")
})

test("cleanUrl keeps origin and path, drops query and hash, rejects non-web schemes", () => {
  assert.equal(cleanUrl("https://www.npmjs.com/package/gitask-cli?token=abc#readme", PAGE), "https://www.npmjs.com/package/gitask-cli")
  assert.equal(cleanUrl("/docs/cli?x=1", PAGE), "https://gitask-me.web.app/docs/cli")
  assert.equal(cleanUrl("javascript:alert(1)", PAGE), null)
  assert.equal(cleanUrl("mailto:someone@example.com", PAGE), null)
  assert.equal(cleanUrl("http://[bad", PAGE), null)
})

test("external text link sends only outbound_click", () => {
  const events = eventsForLink({ href: "https://www.npmjs.com/package/gitask-cli", pageUrl: PAGE, text: "gitask-cli on npm", isButton: false, section: "download" })
  assert.deepEqual(events, [
    {
      name: "outbound_click",
      params: { link_domain: "www.npmjs.com", link_url: "https://www.npmjs.com/package/gitask-cli", link_text: "gitask-cli on npm", section: "download" },
    },
  ])
})

test("external button sends cta_click and outbound_click", () => {
  const names = eventsForLink({ href: "https://marketplace.visualstudio.com/items?itemName=x.gitask", pageUrl: PAGE, text: "VS Code Marketplace", isButton: true, section: "hero" }).map((e) => e.name)
  assert.deepEqual(names, ["cta_click", "outbound_click"])
})

test("internal button keeps the #anchor so the CTA target is clear", () => {
  const [event] = eventsForLink({ href: "#download", pageUrl: PAGE, text: "Other ways to install", isButton: true, section: "hero" })
  assert.equal(event.name, "cta_click")
  assert.equal(event.params.link_url, "/#download")
  assert.equal(event.params.outbound, false)
})

test("internal plain link sends nothing (page_view covers it)", () => {
  assert.deepEqual(eventsForLink({ href: "/docs/intro", pageUrl: PAGE, text: "Docs", isButton: false, section: "navbar" }), [])
})

test(".vsix release link also sends download_vsix with the file name", () => {
  const events = eventsForLink({
    href: "https://github.com/vannseavlong/GITASK/releases/download/v0.6.1/gitask-vscode-0.6.1.vsix",
    pageUrl: PAGE,
    text: "Download gitask-vscode-0.6.1.vsix",
    isButton: false,
    section: "download",
  })
  assert.deepEqual(events[0], { name: "download_vsix", params: { file_name: "gitask-vscode-0.6.1.vsix", section: "download" } })
  assert.equal(events[1].name, "outbound_click")
})

test("unsafe or broken hrefs send nothing", () => {
  for (const href of ["javascript:alert(1)", "mailto:a@b.co", "http://[bad"]) {
    assert.deepEqual(eventsForLink({ href, pageUrl: PAGE, text: "x", isButton: true, section: "hero" }), [])
  }
})

test("searchEvent lowercases, redacts, skips terms under 2 characters", () => {
  assert.equal(searchEvent(" a ", "navbar"), null)
  assert.deepEqual(searchEvent("GitHub Sync", "navbar", false), {
    name: "search",
    params: { search_term: "github sync", search_location: "navbar", has_results: false },
  })
  assert.equal(searchEvent("me@x.io", "search_page")?.params.search_term, "[email]")
  assert.equal("has_results" in (searchEvent("cli", "search_page")?.params ?? {}), false)
})

test("isNewPage ignores the first load and #hash jumps", () => {
  const home = { pathname: "/", search: "" }
  assert.equal(isNewPage(home, null), false)
  assert.equal(isNewPage(home, home), false)
  assert.equal(isNewPage({ pathname: "/docs/cli", search: "" }, home), true)
  assert.equal(isNewPage({ pathname: "/search", search: "?q=a" }, { pathname: "/search", search: "?q=b" }), true)
})

test("measurement id must look like G-XXXX", () => {
  assert.equal(isValidMeasurementId("G-ABC123XYZ9"), true)
  for (const bad of ["", "UA-1234-1", "G-abc", "G-AB'C);alert(1)//", "G-ABC123\n"]) {
    assert.equal(isValidMeasurementId(bad), false, bad)
  }
})

test("headScript checks the host first and refuses unsafe input", () => {
  const script = headScript({ measurementId: "G-ABC123XYZ9", hostname: "gitask-me.web.app" })
  assert.ok(script.indexOf('location.hostname !== "gitask-me.web.app"') < script.indexOf("gtag/js"))
  assert.match(script, /allow_google_signals: false/)
  assert.match(script, /allow_ad_personalization_signals: false/)
  assert.match(script, /page_location: location\.origin \+ location\.pathname/)
  assert.ok(script.indexOf("gtag('set'") < script.indexOf("gtag('config'"))
  assert.ok(script.includes("if (/^\\/search\\/?$/.test(location.pathname)) page.page_title = 'Search';"))
  assert.throws(() => headScript({ measurementId: "G-X'</script>", hostname: "gitask-me.web.app" }))
  assert.throws(() => headScript({ measurementId: "G-ABC123XYZ9", hostname: 'a"b' }))
})

test("internal CTA link_url is capped like every other value", () => {
  const [event] = eventsForLink({ href: "/docs/" + "a".repeat(300), pageUrl: PAGE, text: "Go", isButton: true, section: "hero" })
  assert.ok(String(event.params.link_url).length <= MAX_PARAM_LENGTH)
  assert.ok(String(eventsForLink({ href: "/a#" + "b".repeat(300), pageUrl: PAGE, text: "Go", isButton: true, section: "hero" })[0].params.link_url).length <= MAX_PARAM_LENGTH)
})

test("linkText falls back to aria-label for icon-only links", () => {
  assert.equal(linkText("", "GITASK on GitHub"), "GITASK on GitHub")
  assert.equal(linkText("  ", null), "")
  assert.equal(linkText(" Docs ", "ignored"), "Docs")
})

test("pageTitle hides the query on the search page", () => {
  assert.equal(pageTitle("/search", 'Search results for "me@x.io"'), "Search")
  assert.equal(pageTitle("/search/", "anything"), "Search")
  assert.equal(pageTitle("/docs/cli", "CLI reference | GITASK"), "CLI reference | GITASK")
})

test("cleanReferrer keeps origin and path only", () => {
  assert.equal(cleanReferrer("https://example.com/a/b?utm=1&email=x#h"), "https://example.com/a/b")
  assert.equal(cleanReferrer(""), "")
})

test("track and setPage never throw, with or without gtag", () => {
  const g = globalThis as unknown as { window?: unknown }
  const before = g.window
  try {
    delete g.window
    assert.doesNotThrow(() => track("x", { a: 1 }))
    const calls: unknown[][] = []
    g.window = { gtag: (...args: unknown[]) => calls.push(args) }
    track("cta_click", { section: "hero" })
    setPage({ page_title: "Docs" })
    assert.deepEqual(calls, [["event", "cta_click", { section: "hero" }], ["set", { page_title: "Docs" }]])
    g.window = { gtag: () => { throw new Error("blocked") } }
    assert.doesNotThrow(() => track("x"))
    assert.doesNotThrow(() => setPage({}))
  } finally {
    g.window = before
  }
})
