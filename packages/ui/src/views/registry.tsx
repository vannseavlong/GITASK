import type { ComponentType } from "react";
import type { BoardData, Host, UiState } from "@/host/index.ts";
import { BoardView } from "./board.tsx";
import { ListView } from "./list.tsx";
import { TimelineView } from "./timeline.tsx";
import { OverviewView } from "./overview.tsx";
import { SprintView } from "./sprint.tsx";

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
  /** Drawn only when the board has this (`sprints`: a `sprint` block in gitask.json); otherwise the tab is hidden. */
  requires?: "sprints";
}

/** Default tab order (the user can reorder; see lib/view-order.ts). A view is one entry: `{ id, label, component }`. */
export const VIEWS: readonly ViewDef[] = [
  { id: "overview", label: "Overview", component: OverviewView },
  { id: "board", label: "Board", component: BoardView },
  { id: "list", label: "List", component: ListView },
  { id: "timeline", label: "Timeline", component: TimelineView },
  { id: "sprint", label: "Sprint", component: SprintView, requires: "sprints" },
];

const WITHOUT_SPRINTS = VIEWS.filter((v) => v.requires !== "sprints");

/** The views this board can show: a view that `requires` sprints is hidden while sprints are off. Stable arrays (safe as a memo dependency). */
export const availableViews = (board: { sprints?: unknown } | null): readonly ViewDef[] => (board?.sprints ? VIEWS : WITHOUT_SPRINTS);

/** Opened for a user with no saved view: the first tab. */
export const DEFAULT_VIEW = "overview";
