import { ExternalLink, Package, Terminal, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import {
  FAILURE_TEXT,
  RELEASES_PAGE,
  loadLatestRelease,
  type FailureReason,
  type Release,
} from "../../lib/release"
import { extensionId, links } from "../content"
import { CopyButton, SectionHeading } from "./Shared"

type State =
  | { status: "loading" }
  | { status: "ready"; release: Release }
  | { status: "failed"; reason: FailureReason }

function getSessionStorage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function Command({ text, label }: { text: string; label: string }) {
  return (
    <div className="install-code" role="group" aria-label={label}>
      <code tabIndex={0}>{text}</code>
      <CopyButton value={text} label={`Copy ${label}`} announce />
    </div>
  )
}

// Same on macOS, Windows and Linux. The name is checked again so a bad name
// can never become a copyable command.
function offlineCommand(fileName: string): string | null {
  return /^[A-Za-z0-9._-]+\.vsix$/.test(fileName)
    ? `code --install-extension ./${fileName}`
    : null
}

export default function Download() {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    loadLatestRelease(
      (url, init) => fetch(url, init),
      getSessionStorage(),
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return
      if (result.ok === true) {
        setState({ status: "ready", release: (result as { release: Release }).release })
      } else {
        setState({ status: "failed", reason: (result as { reason: FailureReason }).reason })
      }
    })
    return () => controller.abort()
  }, [])

  const release = state.status === "ready" ? state.release : null
  const offline = release ? offlineCommand(release.fileName) : null
  const statusText =
    state.status === "loading"
      ? "Looking up the latest release…"
      : release
        ? `Latest release${release.tag ? `: ${release.tag}` : ""}. File: ${release.fileName}`
        : ""

  return (
    <section className="section download-section" id="download">
      <div className="container">
        <SectionHeading
          eyebrow="Get GITASK"
          title="Install GITASK"
          text="The same steps on macOS, Windows and Linux."
          align="center"
        />

        <noscript>
          <p className="noscript-note">
            JavaScript is off, so the latest file is not looked up here. Use the{" "}
            <a href={links.marketplace}>Marketplace</a>, <a href={links.openVsx}>Open VSX</a>{" "}
            or the <a href={RELEASES_PAGE}>GitHub releases page</a>.
          </p>
        </noscript>

        <div className="install-cta">
          <div>
            <span className="os-icon">
              <Package size={21} />
            </span>
            <div>
              <strong>VS Code extension</strong>
              <small>Updates arrive automatically. Also works in VSCodium, Cursor and Windsurf.</small>
            </div>
          </div>
          <div className="install-cta-actions">
            <a
              className="button primary"
              href={links.marketplace}
              target="_blank"
              rel="noreferrer"
            >
              VS Code Marketplace <ExternalLink size={15} />
            </a>
            <a
              className="button secondary"
              href={links.openVsx}
              target="_blank"
              rel="noreferrer"
            >
              Open VSX <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <div className="download-grid two-grid">
          <article className="download-card">
            <div className="download-title">
              <span className="os-icon">
                <Package size={21} />
              </span>
              <div>
                <h3>From a terminal</h3>
                <small>Or install without the Marketplace page</small>
              </div>
            </div>
            <Command
              text={`code --install-extension ${extensionId}`}
              label="VS Code install command"
            />
            <p className="shell-label">Offline? Download the .vsix, then run:</p>
            {offline ? (
              <Command text={offline} label="offline install command" />
            ) : null}
            <a
              className="text-link"
              href={release ? release.url : RELEASES_PAGE}
              {...(release ? {} : { target: "_blank", rel: "noreferrer" })}
            >
              {release ? `Download ${release.fileName}` : "Get the .vsix from GitHub"}
              {release ? null : <ExternalLink size={13} />}
            </a>
            <p className="release-status" role="status" aria-live="polite">
              {statusText}
            </p>
            {state.status === "failed" && (
              <p className="release-error" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>{FAILURE_TEXT[state.reason]}</span>
              </p>
            )}
          </article>

          <article className="download-card">
            <div className="download-title">
              <span className="os-icon">
                <Terminal size={21} />
              </span>
              <div>
                <h3>Command line</h3>
                <small>npm · Node 20+</small>
              </div>
            </div>
            <Command text="npm i -g gitask-cli" label="npm install command" />
            <Command text="npx gitask-cli board" label="npx command" />
            <p>Then run <code>gitask</code> in any project.</p>
            <a className="text-link" href={links.npm} target="_blank" rel="noreferrer">
              gitask-cli on npm <ExternalLink size={13} />
            </a>
          </article>
        </div>
      </div>
    </section>
  )
}
