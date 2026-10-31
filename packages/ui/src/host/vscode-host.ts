import type { BoardData, Host, HostMessage, UiState, WebviewMessage } from "./types.ts";

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

export function hasVsCodeApi(): boolean {
  return typeof acquireVsCodeApi === "function";
}

/** Transport for the VS Code webview: the existing postMessage protocol, unchanged. */
export function createVsCodeHost(): Host {
  const api = acquireVsCodeApi();
  const boardSubs = new Set<(b: BoardData) => void>();
  const msgSubs = new Set<(m: Exclude<HostMessage, { type: "board" }>) => void>();

  window.addEventListener("message", (ev: MessageEvent) => {
    const m = ev.data as HostMessage | undefined;
    if (!m || typeof m.type !== "string") return;
    if (m.type === "board") for (const cb of boardSubs) cb(m.board as BoardData);
    else for (const cb of msgSubs) cb(m);
  });

  const host: Host = {
    confirmsDelete: false, // the extension asks with its own modal
    getBoard() {
      return new Promise((resolve) => {
        const off = host.onBoard((b) => {
          off();
          resolve(b);
        });
        api.postMessage({ type: "ready" } satisfies WebviewMessage);
      });
    },
    send: (m) => api.postMessage(m),
    onBoard(cb) {
      boardSubs.add(cb);
      return () => void boardSubs.delete(cb);
    },
    onMessage(cb) {
      msgSubs.add(cb);
      return () => void msgSubs.delete(cb);
    },
    loadState: () => ((api.getState() as UiState | undefined) ?? {}),
    saveState: (s) => api.setState(s),
  };
  return host;
}
