import type { ComponentType } from "react";
import type { BoardData, Host } from "@/host/index.ts";
import { BoardView } from "./board.tsx";
import { PlaceholderView } from "./placeholder.tsx";

/** What the shell hands every view. `board` is already filtered; `full` is the board as the host sent it. */
export interface ViewProps {
  board: BoardData;
  full: BoardData;
  host: Host;
}

export interface ViewDef {
  /** Same ids as packages/vscode/src/views/registry.ts: the extension validates `view` messages against them. */
  id: string;
  label: string;
  component: ComponentType<ViewProps>;
}

const later = (id: string, label: string): ViewDef => ({ id, label, component: () => <PlaceholderView label={label} /> });

/**
 * Tab order. A view is one entry: replace a `later(...)` line with `{ id, label, component }`.
 * Ext-ui-views ports List, Timeline and Overview here.
 */
export const VIEWS: readonly ViewDef[] = [
  { id: "board", label: "Board", component: BoardView },
  later("list", "List"),
  later("timeline", "Timeline"),
  later("overview", "Overview"),
];

export const DEFAULT_VIEW = "board";
