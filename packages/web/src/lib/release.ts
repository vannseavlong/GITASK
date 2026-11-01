// Latest-release lookup for the Download section. Pure: fetch and storage
// are passed in, so tests run without a browser or the network.

export const REPO = "vannseavlong/GITASK"
export const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`
export const CACHE_KEY = "gitask:latest-release:v1"

export interface Release {
  /** Tag name, only kept when it looks like a plain version string. */
  tag: string | null
  /** File name of the .vsix, safe to put in a command. */
  fileName: string
  /** https download URL on github.com for the repo. */
  url: string
}

export type FailureReason =
  | "network"
  | "rate-limit"
  | "not-found"
  | "no-vsix"
  | "bad-response"

export type ReleaseResult =
  | { ok: true; release: Release }
  | { ok: false; reason: FailureReason }

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ResponseLike {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<ResponseLike>

const SAFE_FILE = /^[A-Za-z0-9._-]+\.vsix$/
const SAFE_TAG = /^[A-Za-z0-9._+-]{1,40}$/
const DOWNLOAD_PATH = `/${REPO}/releases/download/`
export const CACHE_MAX_AGE_MS = 60 * 60 * 1000
export const FETCH_TIMEOUT_MS = 8000

/** Exact origin, repo path, ends with the asset name, no traversal or extras. */
function isRepoDownloadUrl(raw: string, name: string): boolean {
  if (/[\s"'<>\\]|\.\.|%|\?|#/.test(raw)) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  return (
    u.origin === "https://github.com" &&
    u.pathname.startsWith(DOWNLOAD_PATH) &&
    u.pathname.endsWith("/" + name) &&
    !u.search &&
    !u.hash &&
    !u.username &&
    !u.password
  )
}

/**
 * Pick the .vsix asset by extension (the name carries the version, so it is
 * never hard-coded). Returns null for a missing, odd-looking or off-repo asset.
 */
export function pickRelease(data: unknown): Release | null {
  if (!data || typeof data !== "object") return null
  const obj = data as { tag_name?: unknown; assets?: unknown }
  if (!Array.isArray(obj.assets)) return null
  for (const asset of obj.assets) {
    if (!asset || typeof asset !== "object") continue
    const { name, browser_download_url: url } = asset as {
      name?: unknown
      browser_download_url?: unknown
    }
    if (typeof name !== "string" || typeof url !== "string") continue
    if (!SAFE_FILE.test(name)) continue
    if (!isRepoDownloadUrl(url, name)) continue
    const tag =
      typeof obj.tag_name === "string" && SAFE_TAG.test(obj.tag_name)
        ? obj.tag_name
        : null
    return { tag, fileName: name, url }
  }
  return null
}

function readCache(storage: StorageLike | null, now: number): Release | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const { tag, fileName, url, savedAt } = parsed as Record<string, unknown>
    if (typeof savedAt !== "number" || now - savedAt > CACHE_MAX_AGE_MS || savedAt > now) return null
    // Re-run the same checks: storage is not trusted either.
    return pickRelease({
      tag_name: tag,
      assets: [{ name: fileName, browser_download_url: url }],
    })
  } catch {
    return null
  }
}

function writeCache(storage: StorageLike | null, release: Release, now: number): void {
  if (!storage) return
  try {
    storage.setItem(CACHE_KEY, JSON.stringify({ ...release, savedAt: now }))
  } catch {
    // Quota, private mode or blocked storage: the page works without it.
  }
}

export async function loadLatestRelease(
  doFetch: FetchLike,
  storage: StorageLike | null,
  signal?: AbortSignal,
  opts: { timeoutMs?: number; now?: () => number } = {},
): Promise<ReleaseResult> {
  const now = (opts.now ?? Date.now)()
  const cached = readCache(storage, now)
  if (cached) return { ok: true, release: cached }

  let res: ResponseLike
  const ctl = new AbortController()
  const onAbort = () => ctl.abort()
  signal?.addEventListener("abort", onAbort)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctl.abort()
        reject(new Error("timeout"))
      }, opts.timeoutMs ?? FETCH_TIMEOUT_MS)
    })
    res = await Promise.race([
      doFetch(RELEASE_API, {
        headers: { Accept: "application/vnd.github+json" },
        signal: ctl.signal,
      }),
      timeout,
    ])
  } catch {
    return { ok: false, reason: "network" }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", onAbort)
  }

  if (res.status === 403 || res.status === 429) {
    return { ok: false, reason: "rate-limit" }
  }
  if (res.status === 404) return { ok: false, reason: "not-found" }
  if (!res.ok) return { ok: false, reason: "bad-response" }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, reason: "bad-response" }
  }
  const release = pickRelease(data)
  if (!release) {
    const hasAssets =
      !!data && typeof data === "object" && Array.isArray((data as { assets?: unknown }).assets)
    return { ok: false, reason: hasAssets ? "no-vsix" : "bad-response" }
  }
  writeCache(storage, release, now)
  return { ok: true, release }
}

/** Plain-text messages; rendered as text nodes only. */
export const FAILURE_TEXT: Record<FailureReason, string> = {
  network: "Could not reach GitHub to find the latest release.",
  "rate-limit": "GitHub is limiting requests right now, so the latest release could not be looked up.",
  "not-found": "No release has been published yet.",
  "no-vsix": "The latest release has no .vsix file attached.",
  "bad-response": "GitHub sent an answer this page could not read.",
}
