import assert from "node:assert/strict"
import { test } from "node:test"
import {
  CACHE_KEY,
  RELEASE_API,
  loadLatestRelease,
  pickRelease,
  type FetchLike,
  type StorageLike,
} from "../src/lib/release.ts"

const BASE = "https://github.com/vannseavlong/GITASK/releases/download/v9.9.9/"
const good = {
  tag_name: "v9.9.9",
  body: "<img src=x onerror=alert(1)>",
  assets: [
    { name: "gitask-cli-9.9.9.tgz", browser_download_url: BASE + "gitask-cli-9.9.9.tgz" },
    { name: "gitask-vscode-9.9.9.vsix", browser_download_url: BASE + "gitask-vscode-9.9.9.vsix" },
  ],
}

const reply = (status: number, body: unknown): FetchLike => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body instanceof Error) throw body
    return body
  },
})

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

test("finds the .vsix by extension, whatever the version", async () => {
  const r = await loadLatestRelease(reply(200, good), null)
  assert.deepEqual(r, {
    ok: true,
    release: {
      tag: "v9.9.9",
      fileName: "gitask-vscode-9.9.9.vsix",
      url: BASE + "gitask-vscode-9.9.9.vsix",
    },
  })
})

test("asks the unauthenticated releases/latest endpoint", async () => {
  let seen = ""
  let headers: Record<string, string> | undefined
  await loadLatestRelease(async (url, init) => {
    seen = url
    headers = init?.headers
    return { ok: true, status: 200, json: async () => good }
  }, null)
  assert.equal(seen, RELEASE_API)
  assert.equal(RELEASE_API, "https://api.github.com/repos/vannseavlong/GITASK/releases/latest")
  assert.ok(!headers || !("Authorization" in headers))
})

test("network error -> network", async () => {
  const r = await loadLatestRelease(async () => { throw new TypeError("offline") }, null)
  assert.deepEqual(r, { ok: false, reason: "network" })
})

test("403 and 429 -> rate-limit", async () => {
  assert.deepEqual(await loadLatestRelease(reply(403, { message: "rate limit" }), null), { ok: false, reason: "rate-limit" })
  assert.deepEqual(await loadLatestRelease(reply(429, {}), null), { ok: false, reason: "rate-limit" })
})

test("404 -> not-found (no release yet)", async () => {
  assert.deepEqual(await loadLatestRelease(reply(404, { message: "Not Found" }), null), { ok: false, reason: "not-found" })
})

test("release without a .vsix -> no-vsix", async () => {
  const none = { tag_name: "v1", assets: [{ name: "notes.txt", browser_download_url: BASE + "notes.txt" }] }
  assert.deepEqual(await loadLatestRelease(reply(200, none), null), { ok: false, reason: "no-vsix" })
  assert.deepEqual(await loadLatestRelease(reply(200, { tag_name: "v1", assets: [] }), null), { ok: false, reason: "no-vsix" })
})

test("500, bad JSON and wrong shapes -> bad-response", async () => {
  assert.deepEqual(await loadLatestRelease(reply(500, {}), null), { ok: false, reason: "bad-response" })
  assert.deepEqual(await loadLatestRelease(reply(200, new SyntaxError("x")), null), { ok: false, reason: "bad-response" })
  assert.deepEqual(await loadLatestRelease(reply(200, "text"), null), { ok: false, reason: "bad-response" })
  assert.deepEqual(await loadLatestRelease(reply(200, { tag_name: "v1" }), null), { ok: false, reason: "bad-response" })
})

test("asset names and URLs that are unsafe are ignored", () => {
  const evil = (name: string, url: string) => pickRelease({ assets: [{ name, browser_download_url: url }] })
  assert.equal(evil("x;rm -rf.vsix", BASE + "x.vsix"), null)
  assert.equal(evil("x.vsix", "https://evil.example/x.vsix"), null)
  assert.equal(evil("x.vsix", "javascript:alert(1)"), null)
  assert.equal(evil("x.vsix", "https://github.com/other/repo/releases/download/v1/x.vsix"), null)
  assert.equal(evil("x.vsix", BASE + 'x.vsix"onmouseover="a'), null)
})

test("URL must be exact origin, repo path and end with the asset name", () => {
  const u = (url: string, name = "x.vsix") => pickRelease({ assets: [{ name, browser_download_url: url }] })
  const ok = "https://github.com/vannseavlong/GITASK/releases/download/v1/x.vsix"
  assert.ok(u(ok))
  assert.equal(u("https://github.com/vannseavlong/GITASK/releases/download/../../../evil/x.vsix"), null)
  assert.equal(u("https://github.com/vannseavlong/GITASK/releases/download/v1/y.vsix"), null)
  assert.equal(u(ok, "y.vsix"), null)
  assert.equal(u(ok + "?a=1"), null)
  assert.equal(u(ok + "#x"), null)
  assert.equal(u("https://github.com/vannseavlong/GITASK/releases/download/v%2e1/x.vsix"), null)
  assert.equal(u("https://github.com.evil.example/vannseavlong/GITASK/releases/download/v1/x.vsix"), null)
  assert.equal(u("https://user@github.com/vannseavlong/GITASK/releases/download/v1/x.vsix"), null)
  assert.equal(u("http://github.com/vannseavlong/GITASK/releases/download/v1/x.vsix"), null)
})

test("a hung request becomes the network failure", async () => {
  const hang: FetchLike = () => new Promise(() => {})
  const r = await loadLatestRelease(hang, null, undefined, { timeoutMs: 20 })
  assert.deepEqual(r, { ok: false, reason: "network" })
})

test("cache older than an hour is a miss", async () => {
  const store = memory()
  let t = 1_000_000
  await loadLatestRelease(reply(200, good), store, undefined, { now: () => t })
  t += 30 * 60 * 1000
  const fresh = await loadLatestRelease(async () => { throw new Error("no fetch") }, store, undefined, { now: () => t })
  assert.equal(fresh.ok, true)
  t += 40 * 60 * 1000
  const stale = await loadLatestRelease(async () => { throw new Error("offline") }, store, undefined, { now: () => t })
  assert.deepEqual(stale, { ok: false, reason: "network" })
})

test("a weird tag is dropped, release text is never returned", () => {
  const r = pickRelease({ ...good, tag_name: "<script>" })
  assert.equal(r?.tag, null)
  assert.deepEqual(Object.keys(r ?? {}).sort(), ["fileName", "tag", "url"])
})

test("success is cached and the next call does not fetch", async () => {
  const store = memory()
  await loadLatestRelease(reply(200, good), store)
  assert.ok(store.data.has(CACHE_KEY))
  const r = await loadLatestRelease(async () => { throw new Error("must not fetch") }, store)
  assert.equal(r.ok, true)
})

test("failures are not cached", async () => {
  const store = memory()
  await loadLatestRelease(reply(404, {}), store)
  assert.equal(store.data.size, 0)
})

test("storage that throws does not break the lookup", async () => {
  const broken: StorageLike = {
    getItem: () => { throw new Error("blocked") },
    setItem: () => { throw new Error("quota") },
  }
  const r = await loadLatestRelease(reply(200, good), broken)
  assert.equal(r.ok, true)
})

test("a tampered cache entry is revalidated and refetched", async () => {
  const store = memory()
  store.data.set(CACHE_KEY, JSON.stringify({ tag: "v1", fileName: "a;b.vsix", url: "https://evil.example/a.vsix", savedAt: Date.now() }))
  const r = await loadLatestRelease(reply(200, good), store)
  assert.equal(r.ok && r.release.fileName, "gitask-vscode-9.9.9.vsix")
  store.data.set(CACHE_KEY, "not json")
  assert.equal((await loadLatestRelease(reply(200, good), store)).ok, true)
})
