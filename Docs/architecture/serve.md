# gitask serve

`gitask serve [--port 4173] [--host 127.0.0.1] [--dir Tasks] [--no-open] [--no-commit]` serves the React UI ([ui.md](ui.md)) in a browser. Code: `packages/cli/src/serve.ts` (http), `packages/cli/src/handler.ts` (messages), `packages/ui/src/host/http-host.ts` (browser side, same `Host` interface as VS Code).

The UI bundle is inlined into `dist/gitask.js` by esbuild (`--loader:.js=text`), so `npx gitask serve` needs no other files. `pnpm build` builds `packages/ui` first.

## Security model

The server can write to the repo (move, delete, commit), so it is closed by default.

- **Bind:** `127.0.0.1` unless `--host` is passed. `--port 0` picks a free port; a busy port stops with a clear message.
- **Token:** 32 random bytes (hex), printed in the URL (`/?token=...`). Every `/api/*` request needs it, in header `X-Gitask-Token` (query `token` only for `/api/events`, since `EventSource` cannot set headers). Compared in constant time (hash then `timingSafeEqual`). The page removes it from the address bar and keeps it in `sessionStorage`.
- **Host and Origin:** `Host` must be the bound address (plus `localhost` for loopback); `Origin`, when sent, must be `http://<that address>`. Blocks DNS rebinding and other web pages. No CORS headers are sent, and `POST` needs `Content-Type: application/json`, so a cross-site page cannot even preflight.
- **Validation:** every message goes through `validateMessage` from `gitask-core` (`packages/core/src/protocol.ts`), the same function the VS Code extension uses; paths must be `<Tasks>/<existing column>/<file>.md`.
- **Body cap:** 64 KiB, then `413`. Malformed JSON is `400`.
- **Static files:** a fixed map (`/`, `/ui.js`, `/ui.css`) served from memory, never from the file system, so there is no path to traverse. Strict CSP (`default-src 'none'`, nonce'd script and style, `connect-src 'self'`, `frame-ancestors 'none'`), `nosniff`, `no-referrer`, `no-store`.
- With `--host 0.0.0.0` the token is the only protection on the network and traffic is plain HTTP: use only on trusted networks.

## Endpoints

| Method and path | Purpose |
|---|---|
| `GET /` , `/ui.js`, `/ui.css` | the app (no token; contains no data) |
| `GET /api/board` | the board JSON |
| `POST /api/message` | one `WebviewMessage`; answers `{ ok, reply? }` (`reply` is a `taskBody` or `error` host message). `400` when validation rejects it |
| `GET /api/taskBody?path=` | task file text (`readTask`) |
| `GET /api/events` | Server-Sent Events: `event: board` on connect and after any change under the Tasks dir (`fs.watch`, 150 ms debounce, unchanged boards are not re-sent) |

Message shapes: [ui.md](ui.md) and `packages/core/src/protocol.ts`. Browser differences: `open` is ignored (a browser cannot open an editor), `new` creates `New-task-<timestamp>` from the template, `view` is kept in `localStorage`.
