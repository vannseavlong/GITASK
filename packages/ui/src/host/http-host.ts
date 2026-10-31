import type { BoardData, Host, HostMessage, UiState, WebviewMessage } from "./types.ts";

type Other = Exclude<HostMessage, { type: "board" }>;

/**
 * The token for this tab. The URL may carry `?token=` (the one `gitask serve` prints) or `?code=` (a one-time code from
 * the browser launcher, exchanged here via POST /api/auth). Either is removed from the address bar; the token is
 * remembered for the tab only.
 */
async function readToken(base: string): Promise<string> {
  let t = "";
  try {
    const q = new URLSearchParams(location.search);
    t = q.get("token") ?? "";
    const code = q.get("code") ?? "";
    if (t || code) history.replaceState(null, "", location.pathname);
    if (!t && code) {
      try {
        const r = await fetch(`${base}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
        if (r.ok) t = ((await r.json()) as { token?: string }).token ?? "";
      } catch { /* getBoard reports the 401 */ }
    }
    if (t) {
      try { sessionStorage.setItem("gitask.token", t); } catch { /* blocked */ }
    } else {
      t = sessionStorage.getItem("gitask.token") ?? "";
    }
  } catch { /* no location/storage */ }
  return t;
}

/**
 * Transport for a browser against `gitask serve`: fetch for requests, Server-Sent Events for board pushes.
 * Same Host interface as VS Code; the server validates every message.
 */
export function createHttpHost(base = ""): Host {
  let token = "";
  const ready = readToken(base).then((t) => { token = t; });
  const boardSubs = new Set<(b: BoardData) => void>();
  const msgSubs = new Set<(m: Other) => void>();
  let es: EventSource | undefined;
  let last: BoardData | undefined;

  const emitMsg = (m: Other) => { for (const cb of msgSubs) cb(m); };
  const emitBoard = (b: BoardData) => { last = b; for (const cb of boardSubs) cb(b); };
  const headers = (): Record<string, string> => ({ "X-Gitask-Token": token });

  async function connect(): Promise<void> {
    await ready;
    if (es || typeof EventSource === "undefined") return;
    es = new EventSource(`${base}/api/events?token=${encodeURIComponent(token)}`);
    es.addEventListener("board", (ev) => { try { emitBoard(JSON.parse((ev as MessageEvent<string>).data) as BoardData); } catch { /* ignore a bad frame */ } });
    es.addEventListener("message", (ev) => { try { emitMsg(JSON.parse((ev as MessageEvent<string>).data) as Other); } catch { /* ignore */ } });
    // EventSource reconnects by itself; a fresh board arrives on reconnect.
  }

  async function post(m: WebviewMessage): Promise<void> {
    await ready;
    try {
      const r = await fetch(`${base}/api/message`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(m) });
      const body = (await r.json().catch(() => ({}))) as { reply?: HostMessage; error?: string };
      if (body.reply && body.reply.type !== "board") emitMsg(body.reply);
      else if (!r.ok) emitMsg({ type: "error", message: body.error ?? `request failed (${r.status})` });
    } catch (e) {
      emitMsg({ type: "error", message: `Cannot reach the GITASK server: ${(e as Error).message}` });
    }
  }

  /** Browsers have no save dialog: fetch the report and hand it to the download manager. */
  async function download(m: Extract<WebviewMessage, { type: "exportReport" }>): Promise<void> {
    await ready;
    try {
      const r = await fetch(`${base}/api/report`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(m) });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        return emitMsg({ type: "reportExported", ok: false, error: body.error ?? `request failed (${r.status})` });
      }
      const name = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "gitask-report";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      emitMsg({ type: "reportExported", ok: true, path: name });
    } catch (e) {
      emitMsg({ type: "reportExported", ok: false, error: `Cannot reach the GITASK server: ${(e as Error).message}` });
    }
  }

  return {
    confirmsDelete: true,
    async getBoard() {
      void connect();
      await ready;
      const r = await fetch(`${base}/api/board`, { headers: headers() });
      if (!r.ok) throw new Error(r.status === 401 ? "Missing or wrong token: open the URL printed by `gitask serve`." : `server answered ${r.status}`);
      const b = (await r.json()) as BoardData;
      emitBoard(b);
      void post({ type: "ready" }); // the server backfills task ids and contributors once, then pushes a fresh board
      return b;
    },
    send(m) {
      if (m.type === "view") return; // remembered in localStorage (saveState)
      if (m.type === "ready") { void connect(); if (last) queueMicrotask(() => emitBoard(last!)); }
      if (m.type === "exportReport") return void download(m);
      if (m.type === "open") return emitMsg({ type: "error", message: `Open ${m.path} in your editor: a browser cannot open files.` });
      void post(m);
    },
    onBoard(cb) { boardSubs.add(cb); return () => void boardSubs.delete(cb); },
    onMessage(cb) { msgSubs.add(cb); return () => void msgSubs.delete(cb); },
    loadState() {
      try { return JSON.parse(localStorage.getItem("gitask.ui") ?? "{}") as UiState; } catch { return {}; }
    },
    saveState(s) {
      try { localStorage.setItem("gitask.ui", JSON.stringify(s)); } catch { /* storage blocked */ }
    },
  };
}
