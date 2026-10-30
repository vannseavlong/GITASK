// The built UI (packages/ui -> packages/vscode/dist/ui), inlined as text by esbuild (`--loader:.js=text`),
// so the published CLI needs no other files.
import js from "../../vscode/dist/ui/ui.js";
import css from "../../vscode/dist/ui/ui.css";

export const assets = { js, css };
