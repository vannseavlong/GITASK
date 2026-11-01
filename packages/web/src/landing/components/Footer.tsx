import useBaseUrl from "@docusaurus/useBaseUrl"
import GitHubIcon from "./GitHubIcon"
import { links } from "../content"

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="brand" href="#">
            <img src={useBaseUrl("/img/icon.png")} alt="" />
            <span>GITASK</span>
          </a>
          <p>Git-backed Kanban for a plain-Markdown Tasks folder.</p>
          <span>MIT licensed</span>
        </div>
        <div>
          <h3>Product</h3>
          <a href="#features">Features</a>
          <a href="#whats-new">What's new</a>
          <a href="#views">Views</a>
          <a href="#download">Download</a>
        </div>
        <div>
          <h3>Docs</h3>
          <a href={links.docs}>Getting started</a>
          <a href="/docs/cli">CLI reference</a>
          <a href="/docs/report">Reports</a>
        </div>
        <div>
          <h3>Community</h3>
          <a href={links.repo} target="_blank" rel="noreferrer">
            <GitHubIcon size={14} /> GitHub
          </a>
          <a href={links.issues} target="_blank" rel="noreferrer">
            Issues
          </a>
          <a href={links.marketplace} target="_blank" rel="noreferrer">
            VS Code Marketplace
          </a>
          <a href={links.openVsx} target="_blank" rel="noreferrer">
            Open VSX
          </a>
          <a href={links.npm} target="_blank" rel="noreferrer">
            npm
          </a>
          <a href={links.portfolio} target="_blank" rel="noreferrer">
            Portfolio
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} GITASK</span>
        <span>
          Built by{" "}
          <a href={links.portfolio} target="_blank" rel="noreferrer">
            Vann Seavlong
          </a>
        </span>
      </div>
    </footer>
  )
}
