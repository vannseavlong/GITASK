import { Menu, Moon, Sun, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useColorMode } from "@docusaurus/theme-common"
import useBaseUrl from "@docusaurus/useBaseUrl"
import { links, navItems } from "../content"
import GitHubIcon from "./GitHubIcon"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { colorMode: theme, setColorMode: setTheme } = useColorMode()
  const icon = useBaseUrl("/img/icon.png")
  const headerRef = useRef<HTMLElement>(null)

  // Escape or a tap outside the header closes the mobile menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open])

  return (
    <header className="navbar" ref={headerRef}>
      <div className="nav-inner">
        <a className="brand" href="#" aria-label="GITASK home">
          <img src={icon} alt="" />
          <span>GITASK</span>
          <small>Git + Task</small>
        </a>
        <nav
          id="nav-links"
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
            <GitHubIcon size={16} /> GitHub
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
            <GitHubIcon size={18} />
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
            aria-controls="nav-links"
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
