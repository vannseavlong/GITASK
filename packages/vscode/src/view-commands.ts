import { VIEW_IDS } from "./view-ids.ts";

type ViewId = (typeof VIEW_IDS)[number];

/** One palette command per view: opens (or focuses) the panel on that view. package.json must list the same ids (tested). */
export const VIEW_COMMANDS: readonly { command: string; view: ViewId }[] = VIEW_IDS.map((view) => ({
  command: `gitask.show${view[0]!.toUpperCase()}${view.slice(1)}`,
  view,
}));
