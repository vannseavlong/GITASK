import { randomBytes } from "node:crypto";
import { DEFAULT_VIEW } from "./view-ids.ts";

export interface UiHtmlOptions {
  /** Fixed nonce for tests; a random one is used otherwise. */
  nonce?: string;
  /** `webview.cspSource`. */
  cspSource: string;
  /** `webview.asWebviewUri(dist/ui/ui.js)` and `.../ui.css`. */
  scriptUri: string;
  styleUri: string;
  /** View to open first (the remembered one). */
  initialView?: string;
}

function attr(v: string): string {
  return v.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The page for the React UI (packages/ui). The bundle is a file in the extension, loaded through
 * `asWebviewUri`; there is no inline script and no inline style element.
 *  - script-src: this page's nonce plus the extension's own files (`cspSource`).
 *  - style-src: the extension's own files, plus the nonce for the `<style>` Radix injects (it reads the
 *    page nonce from `data-nonce`). `style-src-attr 'unsafe-inline'` is for style *attributes* only
 *    (Radix and React position elements with them); style elements stay locked down.
 */
export function uiHtml(views: readonly string[], o: UiHtmlOptions): string {
  const nonce = o.nonce ?? randomBytes(16).toString("base64");
  const initial = views.includes(o.initialView ?? "") ? o.initialView! : DEFAULT_VIEW;
  const csp = `default-src 'none'; script-src 'nonce-${nonce}' ${o.cspSource}; style-src ${o.cspSource} 'nonce-${nonce}'; style-src-attr 'unsafe-inline';`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${attr(csp)}">
<title>GITASK</title>
<link rel="stylesheet" href="${attr(o.styleUri)}">
</head>
<body>
<div id="root" data-nonce="${attr(nonce)}" data-initial-view="${attr(initial)}"></div>
<script type="module" nonce="${attr(nonce)}" src="${attr(o.scriptUri)}"></script>
</body></html>`;
}
