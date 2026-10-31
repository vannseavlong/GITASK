import { ExternalLink, Package, ShoppingBag, Terminal } from "lucide-react"
import { installCommand, links } from "../content"
import { CopyButton, SectionHeading } from "./Shared"

export default function Download() {
  return (
    <section className="section download-section" id="download">
      <div className="container">
        <SectionHeading
          eyebrow="Get GITASK"
          title="Install GITASK"
          text="One extension for macOS, Windows and Linux, and a CLI for any terminal."
          align="center"
        />
        <div className="download-grid">
          <article className="download-card is-primary">
            <div className="download-title">
              <span className="os-icon">
                <ShoppingBag size={21} />
              </span>
              <div>
                <h3>VS Code Marketplace</h3>
                <small>Recommended · VS Code</small>
              </div>
            </div>
            <a
              className="button primary full"
              href={links.marketplace}
              target="_blank"
              rel="noreferrer"
            >
              Install from Marketplace <ExternalLink size={15} />
            </a>
            <div className="install-code">
              <code>{installCommand}</code>
              <CopyButton value={installCommand} />
            </div>
            <p>Updates arrive automatically. Or search “GITASK” in the Extensions view.</p>
          </article>
          <article className="download-card">
            <div className="download-title">
              <span className="os-icon">
                <Package size={21} />
              </span>
              <div>
                <h3>Open VSX</h3>
                <small>VSCodium, Cursor, Windsurf</small>
              </div>
            </div>
            <a
              className="button secondary full"
              href={links.openVsx}
              target="_blank"
              rel="noreferrer"
            >
              Open in Open VSX <ExternalLink size={15} />
            </a>
            <p>For editors that use the Open VSX registry instead of the Marketplace.</p>
            <a
              className="text-link"
              href={links.releases}
              target="_blank"
              rel="noreferrer"
            >
              Offline? Get the .vsix from GitHub <ExternalLink size={13} />
            </a>
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
            <div className="install-code">
              <code>npm i -g gitask-cli</code>
              <CopyButton value="npm i -g gitask-cli" />
            </div>
            <div className="install-code">
              <code>gitask serve</code>
              <CopyButton value="gitask serve" />
            </div>
            <p>
              Then run <code>gitask</code> in any project. No install? Use{" "}
              <code>npx gitask-cli serve</code>.
            </p>
            <a
              className="text-link"
              href={links.npm}
              target="_blank"
              rel="noreferrer"
            >
              gitask-cli on npm <ExternalLink size={13} />
            </a>
          </article>
        </div>
      </div>
    </section>
  )
}
