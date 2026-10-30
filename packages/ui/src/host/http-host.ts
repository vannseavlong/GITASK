import type { BoardData, Host, UiState } from "./types.ts";

/**
 * Transport for a browser against `gitask serve` (fetch + Server-Sent Events). This is a stub:
 * CLI-serve fills it in. Until then it reports plainly that no server is wired up.
 */
export function createHttpHost(): Host {
  const msgSubs = new Set<(m: { type: "error"; message: string }) => void>();
  const unavailable = "No GITASK server is connected. Run `gitask serve` (not available yet).";
  return {
    getBoard: () => Promise.reject(new Error(unavailable)),
    send() {
      for (const cb of msgSubs) cb({ type: "error", message: unavailable });
    },
    onBoard: (_cb: (b: BoardData) => void) => () => undefined,
    onMessage(cb) {
      msgSubs.add(cb as (m: { type: "error"; message: string }) => void);
      return () => void msgSubs.delete(cb as (m: { type: "error"; message: string }) => void);
    },
    loadState() {
      try {
        return JSON.parse(localStorage.getItem("gitask.ui") ?? "{}") as UiState;
      } catch {
        return {};
      }
    },
    saveState(s) {
      try {
        localStorage.setItem("gitask.ui", JSON.stringify(s));
      } catch {
        /* storage blocked */
      }
    },
  };
}
