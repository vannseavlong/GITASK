import type { Board, Person } from "gitask-core";
import type { HostMessage, WebviewMessage } from "@host-src/protocol.ts";

/** What the extension (or server) sends with a board: the core board plus view settings. */
export type BoardData = Board & { settings?: { staleDays: number }; people?: Person[] };

export type { HostMessage, WebviewMessage };

/** Remembered UI state. Small, JSON only. */
export interface UiState {
  view?: string;
  filter?: string;
  hiddenStatuses?: string[];
  range?: { from?: string; to?: string; field?: string };
  /** Per-view state, remembered across tab switches. */
  list?: { q?: string; status?: string; tier?: string; owner?: string; sort?: string; dir?: string; /** Task paths whose sub-tasks are open. */ expanded?: string[] };
  board?: { expanded?: string[] };
  timeline?: { mode?: "calendar" | "waterfall"; zoom?: string; year?: number; month?: number };
  overview?: { all?: Record<string, boolean> };
}

/**
 * The one transport the UI talks to. VS Code uses postMessage (VsCodeHost), a browser uses
 * fetch + Server-Sent Events (HttpHost). Screens never import either directly.
 */
export interface Host {
  /** Ask for the board and resolve with the next one the host sends. */
  getBoard(): Promise<BoardData>;
  /** Send a message. The same messages in every host; each is validated on the receiving side. */
  send(message: WebviewMessage): void;
  /** Called with every board the host sends. Returns an unsubscribe function. */
  onBoard(cb: (board: BoardData) => void): () => void;
  /** Called with every other host message (`taskBody`, `error`). Returns an unsubscribe function. */
  onMessage(cb: (message: Exclude<HostMessage, { type: "board" }>) => void): () => void;
  /** Remembered UI state (VS Code webview state, or localStorage in a browser). */
  loadState(): UiState;
  saveState(state: UiState): void;
}
