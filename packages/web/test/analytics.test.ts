import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MAX_PARAM_LENGTH,
  cleanText,
  cleanUrl,
  eventsForLink,
  isNewPage,
  searchEvent,
} from "../src/analytics/events.ts"
import { headScript, isValidMeasurementId } from "../src/analytics/plugin.ts"

const PAGE = "https://gitask-me.web.app/"

test("cleanText trims, redacts emails and long numbers, and caps length", () => {
  assert.equal(cleanText("  npm   i -g\ngitask-cli "), "npm i -g gitask-cli")
  assert.equal(cleanText("mail me at sam.lee@example.com please"), "mail me at [email] please")
  assert.equal(cleanText("call 012 345 678 now"), "call [number] now")
  assert.equal(cleanText("card 4111-1111-1111-1111"), "card [number]")
  assert.equal(cleanText("version 0.6.1 and 12345"), "version 0.6.1 and 12345")
  assert.equal(cleanText("x".repeat(500)).length, MAX_PARAM_LENGTH)
  assert.equal(cleanText(undefined), "")
  assert.equal(cleanText(null), "")
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
  assert.throws(() => headScript({ measurementId: "G-X'</script>", hostname: "gitask-me.web.app" }))
  assert.throws(() => headScript({ measurementId: "G-ABC123XYZ9", hostname: 'a"b' }))
})
