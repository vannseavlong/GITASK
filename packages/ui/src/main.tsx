import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./shell/App.tsx";
import { createHost } from "./host/index.ts";
import { hasVsCodeApi } from "./host/vscode-host.ts";

const root = document.getElementById("root")!;
// Radix (react-remove-scroll) injects <style> tags; give them the page nonce so the CSP can stay strict.
const nonce = root.dataset.nonce;
if (nonce) (window as unknown as { __webpack_nonce__?: string }).__webpack_nonce__ = nonce;
// In VS Code the --vscode-* variables always win over the browser dark-mode fallback in index.css.
if (hasVsCodeApi()) document.documentElement.classList.add("vscode-theme");

createRoot(root).render(
  <StrictMode>
    <App host={createHost()} initialView={root.dataset.initialView ?? "board"} />
  </StrictMode>,
);
