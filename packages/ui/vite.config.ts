import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { FILTER_SRC } from "../vscode/src/filter-logic.ts";
import { LOGIC_SRC as LIST_SRC } from "../vscode/src/views/list-logic.ts";

const FILTER_ID = "virtual:gitask-filter-logic";
const LIST_ID = "virtual:gitask-list-logic";

/**
 * The date-range logic is tested as a plain-JS string (filter-logic.ts). The webview CSP forbids eval,
 * so the very same string is emitted here as an ES module: the tested code is the shipped code.
 */
function filterLogic(): Plugin {
  return {
    name: "gitask-filter-logic",
    resolveId: (id) => (id === FILTER_ID || id === LIST_ID ? "\0" + id : undefined),
    load: (id) =>
      id === "\0" + FILTER_ID
        ? FILTER_SRC + "\nexport { rangeDate, rangeNorm, rangeActive, taskDate, inRange, filterBoard, countTasks };\n"
        : id === "\0" + LIST_ID
          ? LIST_SRC + "\nexport { LIST_COLUMNS, listRows, listSort, listFilter, listOptions, listView };\n"
          : undefined,
  };
}

// `vite build` writes the bundle the extension loads: dist/ui/ui.js + ui.css in packages/vscode.
// `vite build --mode mock` writes a standalone page with fixture data (for looking at the UI in a browser).
export default defineConfig(({ mode }) => {
  const mock = mode === "mock";
  return {
    plugins: [react(), tailwindcss(), filterLogic()],
    resolve: { alias: { "@host-src": resolve(import.meta.dirname, "../vscode/src"), "@": resolve(import.meta.dirname, "src") } },
    define: { __MOCK__: JSON.stringify(mock || mode === "development") },
    build: mock
      ? { outDir: process.env.GITASK_UI_MOCK_OUT ?? "dist-mock", emptyOutDir: true }
      : {
          outDir: resolve(import.meta.dirname, "../vscode/dist/ui"),
          emptyOutDir: true,
          cssCodeSplit: false,
          sourcemap: false,
          rollupOptions: {
            input: resolve(import.meta.dirname, "src/main.tsx"),
            output: { entryFileNames: "ui.js", chunkFileNames: "ui-[name].js", assetFileNames: (a) => (a.names?.some((n) => n.endsWith(".css")) ? "ui.css" : "assets/[name][extname]") },
          },
        },
  };
});
