// The tab ids of the React UI (packages/ui/src/views/registry.tsx). The extension validates `view`
// messages against them; a test keeps this list equal to the UI's registry.
export const VIEW_IDS = ["board", "list", "timeline", "overview"] as const;
export const DEFAULT_VIEW = "board";
