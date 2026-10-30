import type { ComponentType } from "react";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import { BoardView } from "./board.tsx";
import { ListView } from "./list.tsx";
import { TimelineView } from "./timeline.tsx";
import { OverviewView } from "./overview.tsx";

/** What the shell hands every view. `board` is already filtered; `full` is the board as the host sent it. */
export interface ViewProps {
  board: BoardData;
  full: BoardData;
  host: Host;
  /** Remembered UI state and a patch function (saved through the host). */
  ui: UiState;
  update: (patch: Partial<UiState>) => void;
  /** Open the task detail panel for this task path. */
  openTask: (path: string) => void;
}

export interface ViewDef {
  /** Same ids as packages/vscode/src/views/registry.ts: the extension validates `view` messages against them. */
  id: string;
  label: string;
  component: ComponentType<ViewProps>;
}

/** Tab order. A view is one entry: `{ id, label, component }`. */
export const VIEWS: readonly ViewDef[] = [
  { id: "board", label: "Board", component: BoardView },
  { id: "list", label: "List", component: ListView },
  { id: "timeline", label: "Timeline", component: TimelineView },
  { id: "overview", label: "Overview", component: OverviewView },
];

export const DEFAULT_VIEW = "board";
