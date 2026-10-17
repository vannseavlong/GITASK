import useBaseUrl from "@docusaurus/useBaseUrl"
import { GitFork } from "lucide-react"
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
          <a href="#views">Views</a>
          <a href="#download">Download</a>
        </div>
        <div>
          <h3>Docs</h3>
          <a href={links.docs}>Getting started</a>
          <a href={links.docs}>Task format</a>
          <a href={links.docs}>CLI reference</a>
        </div>
        <div>
          <h3>Community</h3>
          <a href={links.repo} target="_blank" rel="noreferrer">
            <GitFork size={14} /> GitHub
          </a>
          <a href={links.issues} target="_blank" rel="noreferrer">
            Issues
          </a>
          <a href={links.openVsx} target="_blank" rel="noreferrer">
            Open VSX
          </a>
          <span className="muted-link">npm · pending</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} GITASK</span>
        <span>Built in the open, one task file at a time.</span>
      </div>
    </footer>
  )
}
