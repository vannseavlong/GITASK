// The built UI (packages/ui -> packages/vscode/dist/ui), inlined as text by esbuild (`--loader:.js=text`),
// so the published CLI needs no other files.
import js from "../../vscode/dist/ui/ui.js";
import type { UiAssets } from "./serve.ts";
import css from "../../vscode/dist/ui/ui.css";

export const assets: UiAssets = { js, css };
import iconSvg from "../../vscode/media/icon.svg"; // --loader:.svg=text
import iconPng from "../../vscode/media/icon.png"; // --loader:.png=dataurl

assets.icon = { svg: iconSvg, png: Buffer.from(iconPng.slice(iconPng.indexOf(",") + 1), "base64") };
