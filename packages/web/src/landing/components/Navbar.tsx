import { GitFork, Menu, Moon, Sun, X } from "lucide-react"
import { useState } from "react"
import { useColorMode } from "@docusaurus/theme-common"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { links, navItems } from "../content"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { colorMode: theme, setColorMode: setTheme } = useColorMode()
  const icon = useBaseUrl("/img/icon.png")

  return (
    <header className="navbar">
      <div className="nav-inner">
        <a className="brand" href="#" aria-label="GITASK home">
          <img src={icon} alt="" />
          <span>GITASK</span>
          <small>Git + Task</small>
        </a>
        <nav
          className={`nav-links ${open ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a
            className="mobile-only"
            href={links.repo}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <div className="nav-actions">
          <a
            className="icon-link desktop-only"
            href={links.repo}
            target="_blank"
            rel="noreferrer"
            aria-label="GITASK on GitHub"
          >
            <GitFork size={18} />
          </a>
          <button
            className="icon-link"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a className="button primary desktop-only" href="#download">
            Download
          </a>
          <button
            className="icon-link menu-button"
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}
