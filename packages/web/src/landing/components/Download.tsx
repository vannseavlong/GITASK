import {
  Apple,
  ExternalLink,
  Laptop,
  Monitor,
  Terminal,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useState } from "react"
import { installCommand, links } from "../content"
import { CopyButton, SectionHeading } from "./Shared"

type ReleaseState = { status: "loading" } | { status: "error" } | {
  status: "ready"
  name: string
  url: string
}

const platforms = [
  { name: "macOS", icon: Apple },
  { name: "Windows", icon: Monitor },
  { name: "Linux", icon: Laptop },
] as const

export default function Download() {
  const [release, setRelease] = useState<ReleaseState>({ status: "loading" })

  useEffect(() => {
    fetch("https://api.github.com/repos/vannseavlong/GITASK/releases/latest")
      .then((response) => {
        if (!response.ok) throw new Error("release request failed")
        return response.json()
      })
      .then((data) => {
        const asset = data.assets?.find((item: { name?: string }) =>
          item.name?.endsWith(".vsix"),
        )
        if (!asset?.browser_download_url) throw new Error("no vsix asset")
        setRelease({
          status: "ready",
          name: asset.name,
          url: asset.browser_download_url,
        })
      })
      .catch(() => setRelease({ status: "error" }))
  }, [])

  const extensionCommand = installCommand(
    release.status === "ready" ? release.name : undefined,
  )

  return (
    <section className="section download-section" id="download">
      <div className="container">
        <SectionHeading
          eyebrow="Get GITASK"
          title="Download GITASK"
          text="The same VS Code extension package works on macOS, Windows, and Linux."
          align="center"
        />
        <div className="install-cta">
          <div>
            <span className="icon-tile">
              <ExternalLink size={20} />
            </span>
            <div>
              <strong>Install in VS Code</strong>
              <small>
                Available from Open VSX, or install the verified .vsix from
                GitHub.
              </small>
            </div>
          </div>
          <a
            className="button primary"
            href={links.openVsx}
            target="_blank"
            rel="noreferrer"
          >
            Open in Open VSX <ExternalLink size={15} />
          </a>
        </div>
        {release.status === "error" && (
          <div className="release-error">
            <TriangleAlert size={17} /> Could not reach GitHub,{" "}
            <a href={links.releases}>use the releases page</a>.
          </div>
        )}
        <div className="download-grid">
          {platforms.map(({ name, icon: Icon }) => (
            <article className="download-card" key={name}>
              <div className="download-title">
                <span className="os-icon">
                  <Icon size={21} />
                </span>
                <div>
                  <h3>GITASK for {name}</h3>
                  <small>VS Code extension · .vsix</small>
                </div>
              </div>
              {release.status === "loading" ? (
                <div
                  className="skeleton-block"
                  aria-label="Loading latest release"
                >
                  <i />
                  <i />
                </div>
              ) : release.status === "ready" ? (
                <a className="button secondary full" href={release.url}>
                  Download .vsix
                </a>
              ) : (
                <a className="button secondary full" href={links.releases}>
                  View GitHub Releases
                </a>
              )}
              <div className="install-code">
                <code>{extensionCommand}</code>
                <CopyButton value={extensionCommand} />
              </div>
              <p>
                Download the shared extension file, then run the command from
                the folder containing it.
              </p>
            </article>
          ))}
          <article className="download-card cli-download">
            <div className="download-title">
              <span className="os-icon">
                <Terminal size={21} />
              </span>
              <div>
                <h3>Command line</h3>
                <small>Needs Node 20+</small>
              </div>
            </div>
            <div className="install-code">
              <code>npm i -g gitask-cli</code>
              <CopyButton value="npm i -g gitask-cli" />
            </div>
            <div className="install-code">
              <code>npx gitask-cli board</code>
              <CopyButton value="npx gitask-cli board" />
            </div>
            <p>
              <strong>Publishing not yet confirmed.</strong> These are the
              package’s intended commands; use the repository source until npm
              availability is verified.
            </p>
            <a
              className="text-link"
              href={`${links.repo}/tree/main/packages/cli`}
              target="_blank"
              rel="noreferrer"
            >
              View CLI source <ExternalLink size={13} />
            </a>
          </article>
        </div>
        <noscript>
          <div className="noscript-note">
            JavaScript is off. Download the latest .vsix from{" "}
            <a href={links.releases}>GitHub Releases</a>, then install it with{" "}
            <code>{installCommand()}</code>.
          </div>
        </noscript>
      </div>
    </section>
  )
}
