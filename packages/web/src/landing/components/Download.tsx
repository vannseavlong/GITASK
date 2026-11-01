import {
  ExternalLink,
  Laptop,
  Monitor,
  Package,
  Server,
  Terminal,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import {
  DESKTOP_OS,
  OS_LABEL,
  detectOs,
  installFileCommand,
  primaryOs,
  shellFor,
  type DesktopOs,
  type OsId,
} from "../../lib/os"
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

const OS_ICON: Record<DesktopOs, ReactNode> = {
  mac: <Laptop size={21} />,
  windows: <Monitor size={21} />,
  linux: <Server size={21} />,
}

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

function OsCard({
  os,
  isPrimary,
  state,
}: {
  os: DesktopOs
  isPrimary: boolean
  state: State
}) {
  const release = state.status === "ready" ? state.release : null
  const command = release ? installFileCommand(os, release.fileName) : null
  const shell = shellFor(os) === "powershell" ? "PowerShell" : "Shell"
  return (
    <article className={`download-card${isPrimary ? " is-primary" : ""}`}>
      <div className="download-title">
        <span className="os-icon">{OS_ICON[os]}</span>
        <div>
          <h3>{OS_LABEL[os]}</h3>
          <small>{isPrimary ? "Recommended for your system" : "VS Code extension (.vsix)"}</small>
        </div>
      </div>
      <a
        className={`button ${isPrimary ? "primary" : "secondary"} full`}
        href={release ? release.url : RELEASES_PAGE}
        {...(release ? {} : { target: "_blank", rel: "noreferrer" })}
      >
        {release ? "Download .vsix" : "Get the .vsix from GitHub"}
        {release ? null : <ExternalLink size={15} />}
        <span className="sr-only"> for {OS_LABEL[os]}</span>
      </a>
      {command ? (
        <>
          <p className="shell-label">Then, in {shell}:</p>
          <Command text={command} label={`${shell} install command for ${OS_LABEL[os]}`} />
        </>
      ) : (
        <p>
          Then run <code>code --install-extension</code> with the downloaded file in your
          terminal.
        </p>
      )}
    </article>
  )
}

export default function Download() {
  const [os, setOs] = useState<OsId>("unknown")
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    setOs(detectOs(
        navigator.userAgent,
        navigator.maxTouchPoints,
        (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile,
      ))
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

  const primary = primaryOs(os)
  const release = state.status === "ready" ? state.release : null
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
          text="One extension for macOS, Windows and Linux, and a CLI for any terminal."
          align="center"
        />

        <noscript>
          <p className="noscript-note">
            JavaScript is off, so the latest file is not looked up here. Use the{" "}
            <a href={RELEASES_PAGE}>GitHub releases page</a>, the{" "}
            <a href={links.marketplace}>Marketplace</a> or{" "}
            <a href={links.openVsx}>Open VSX</a>.
          </p>
        </noscript>

        <div className="install-cta">
          <div>
            <span className="os-icon">
              <Package size={21} />
            </span>
            <div>
              <strong>Install in VS Code</strong>
              <small>Opens VS Code on the extension page. Updates arrive automatically.</small>
            </div>
          </div>
          <a className="button primary" href={`vscode:extension/${extensionId}`}>
            Install in VS Code
          </a>
        </div>

        <p className="release-status" role="status" aria-live="polite">
          {statusText}
        </p>

        {state.status === "failed" && (
          <p className="release-error" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>
              {FAILURE_TEXT[state.reason]} Get it from the{" "}
              <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
                GitHub releases page
              </a>
              , the{" "}
              <a href={links.marketplace} target="_blank" rel="noreferrer">
                Marketplace
              </a>{" "}
              or{" "}
              <a href={links.openVsx} target="_blank" rel="noreferrer">
                Open VSX
              </a>
              .
            </span>
          </p>
        )}

        {os === "mobile" && (
          <p className="release-status">
            VS Code extensions install on a computer. Open this page there, or use the
            command line below.
          </p>
        )}

        <div className="download-stack" data-os={os}>
          <div className="download-grid os-grid">
            {DESKTOP_OS.map((id) => (
              <OsCard key={id} os={id} isPrimary={primary === id} state={state} />
            ))}
          </div>

          <div className="download-grid two-grid">
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

            <article className="download-card">
              <div className="download-title">
                <span className="os-icon">
                  <Package size={21} />
                </span>
                <div>
                  <h3>Other places</h3>
                  <small>VSCodium, Cursor, Windsurf, offline</small>
                </div>
              </div>
              <ul className="plain-links">
                <li>
                  <a href={links.marketplace} target="_blank" rel="noreferrer">
                    VS Code Marketplace <ExternalLink size={13} />
                  </a>
                </li>
                <li>
                  <a href={links.openVsx} target="_blank" rel="noreferrer">
                    Open VSX <ExternalLink size={13} />
                  </a>
                </li>
                <li>
                  <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
                    GitHub releases <ExternalLink size={13} />
                  </a>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
