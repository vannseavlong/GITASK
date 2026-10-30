// `gitask serve`: the React UI in a browser. node:http only. Security model: Docs/architecture/serve.md.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { watch, type FSWatcher } from "node:fs";
import { networkInterfaces } from "node:os";
import type { AddressInfo } from "node:net";
import { createHandler } from "./handler.ts";

export const MAX_BODY_BYTES = 64 * 1024;

export interface UiAssets {
  js: string;
  css: string;
}

export interface ServeOptions {
  dir: string;
  port?: number;
  host?: string;
  commit?: boolean;
  owner?: string;
  assets: UiAssets;
  /** Fixed token for tests; random 32 bytes (hex) otherwise. */
  token?: string;
  debounceMs?: number;
}

export interface RunningServer {
  url: string;
  token: string;
  port: number;
  host: string;
  close(): Promise<void>;
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function allowedHosts(host: string, port: number): Set<string> {
  const names = new Set<string>([host]);
  if (host === "127.0.0.1" || host === "localhost") { names.add("127.0.0.1"); names.add("localhost"); }
  if (host === "0.0.0.0" || host === "::") {
    names.add("127.0.0.1"); names.add("localhost");
    for (const list of Object.values(networkInterfaces())) for (const i of list ?? []) names.add(i.family === "IPv6" ? `[${i.address}]` : i.address);
  }
  if (host === "::1") names.add("[::1]");
  return new Set([...names].map((n) => `${n}:${port}`));
}

function indexHtml(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GITASK</title>
<link rel="stylesheet" href="/ui.css"></head>
<body><div id="root" data-nonce="${nonce}" data-initial-view="board"></div>
<script type="module" nonce="${nonce}" src="/ui.js"></script></body></html>`;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error("body too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startServer(o: ServeOptions): Promise<RunningServer> {
  const host = o.host ?? "127.0.0.1";
  const token = o.token ?? randomBytes(32).toString("hex");
  const handler = createHandler({ dir: o.dir, commit: o.commit, owner: o.owner });
  const clients = new Set<ServerResponse>();
  let lastBoard = "";
  let hosts = new Set<string>();
  let origins = new Set<string>();

  const baseHeaders = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { ...baseHeaders, "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };

  async function push(force = false): Promise<void> {
    if (!clients.size && !force) return;
    let text: string;
    try {
      text = JSON.stringify(await handler.board());
    } catch (e) {
      text = "";
      const msg = JSON.stringify({ type: "error", message: `Cannot read ${o.dir}: ${(e as Error).message}` });
      for (const c of clients) c.write(`event: message\ndata: ${msg}\n\n`);
    }
    if (!text || (text === lastBoard && !force)) return;
    lastBoard = text;
    for (const c of clients) c.write(`event: board\ndata: ${text}\n\n`);
  }

  async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // 1. Host and Origin must be the address we bound (blocks DNS rebinding and other web pages).
    if (!req.headers.host || !hosts.has(req.headers.host.toLowerCase())) return json(res, 403, { error: "bad host" });
    const origin = req.headers.origin;
    if (origin !== undefined && !origins.has(origin.toLowerCase())) return json(res, 403, { error: "bad origin" });

    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname;

    // Static: a fixed map, never the file system, so there is no path to traverse.
    if (req.method === "GET" && !path.startsWith("/api/")) {
      const csp = (nonce: string) => `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
      if (path === "/" || path === "/index.html") {
        const nonce = randomBytes(16).toString("base64");
        res.writeHead(200, { ...baseHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": csp(nonce) });
        return void res.end(indexHtml(nonce));
      }
      if (path === "/ui.js") { res.writeHead(200, { ...baseHeaders, "Content-Type": "text/javascript; charset=utf-8" }); return void res.end(o.assets.js); }
      if (path === "/ui.css") { res.writeHead(200, { ...baseHeaders, "Content-Type": "text/css; charset=utf-8" }); return void res.end(o.assets.css); }
      return json(res, 404, { error: "not found" });
    }

    // 2. Every API request needs the token (header; query only for SSE, which cannot set headers).
    if (!path.startsWith("/api/")) return json(res, 404, { error: "not found" });
    const given = (req.headers["x-gitask-token"] as string | undefined) ?? (path === "/api/events" ? url.searchParams.get("token") ?? "" : "");
    if (!given || !safeEqual(given, token)) return json(res, 401, { error: "bad token" });

    if (req.method === "GET" && path === "/api/board") {
      try { return json(res, 200, await handler.board()); } catch (e) { return json(res, 500, { error: (e as Error).message }); }
    }
    if (req.method === "GET" && path === "/api/taskBody") {
      const r = await handler.handle({ type: "readTask", path: url.searchParams.get("path") ?? "" });
      return json(res, r.status === 400 ? 400 : 200, r.reply ?? { error: "no reply" });
    }
    if (req.method === "GET" && path === "/api/events") {
      res.writeHead(200, { ...baseHeaders, "Content-Type": "text/event-stream; charset=utf-8", Connection: "keep-alive" });
      res.write("retry: 2000\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      try { res.write(`event: board\ndata: ${JSON.stringify(await handler.board())}\n\n`); } catch { /* next push reports it */ }
      return;
    }
    if (req.method === "POST" && path === "/api/message") {
      if (!/^application\/json\b/i.test(req.headers["content-type"] ?? "")) return json(res, 415, { error: "content-type must be application/json" });
      let raw: unknown;
      try { raw = JSON.parse(await readBody(req)); } catch (e) {
        const status = (e as { status?: number }).status ?? 400;
        return json(res, status, { error: status === 413 ? "body too large" : "malformed JSON" });
      }
      const r = await handler.handle(raw);
      if (r.changed) await push(true);
      return json(res, r.status, { ok: r.status === 200, reply: r.reply });
    }
    if (req.method === "POST" && path === "/api/report") {
      if (!/^application\/json\b/i.test(req.headers["content-type"] ?? "")) return json(res, 415, { error: "content-type must be application/json" });
      let raw: unknown;
      try { raw = JSON.parse(await readBody(req)); } catch (e) {
        const status = (e as { status?: number }).status ?? 400;
        return json(res, status, { error: status === 413 ? "body too large" : "malformed JSON" });
      }
      const r = await handler.report(raw);
      if (!r.file) return json(res, r.status, { error: r.error });
      res.writeHead(200, {
        "Content-Type": r.file.mime,
        "Content-Disposition": `attachment; filename="${r.file.name.replace(/[^\w.-]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      return void res.end(r.file.content);
    }
    return json(res, 404, { error: "not found" });
  }

  const server: Server = createServer((req, res) => {
    onRequest(req, res).catch((e) => { if (!res.headersSent) json(res, 500, { error: (e as Error).message }); else res.end(); });
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 0; // SSE streams stay open; bodies are capped instead

  let watcher: FSWatcher | undefined;
  let timer: NodeJS.Timeout | undefined;
  const keepAlive = setInterval(() => { for (const c of clients) c.write(": ping\n\n"); }, 25_000);
  keepAlive.unref();

  return new Promise((resolve, reject) => {
    server.once("error", (e: NodeJS.ErrnoException) => {
      clearInterval(keepAlive);
      reject(e.code === "EADDRINUSE" ? new Error(`Port ${o.port} is already in use. Pick another with --port <n>, or --port 0 for a free one.`) : e);
    });
    server.listen(o.port ?? 4173, host, () => {
      const port = (server.address() as AddressInfo).port;
      hosts = allowedHosts(host, port);
      origins = new Set([...hosts].map((h) => `http://${h}`));
      try {
        watcher = watch(o.dir, { recursive: true }, (_ev, name) => {
          if (name && !/\.(md|json)$/.test(String(name))) return;
          clearTimeout(timer);
          timer = setTimeout(() => void push(), o.debounceMs ?? 150);
        });
        watcher.on("error", () => undefined);
      } catch { /* no watcher: the browser still gets a fresh board after each action */ }
      const shown = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host.includes(":") ? `[${host}]` : host;
      resolve({
        url: `http://${shown}:${port}/?token=${token}`, token, port, host,
        close: () => new Promise<void>((done) => {
          clearTimeout(timer); clearInterval(keepAlive); watcher?.close();
          for (const c of clients) c.end();
          server.close(() => done());
          server.closeAllConnections();
        }),
      });
    });
  });
}
