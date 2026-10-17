import { Check, Copy } from "lucide-react"
import { useState } from "react"

export function SectionHeading({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow: string
  title: string
  text?: string
  align?: "left" | "center"
}) {
  return (
    <header
      className={`section-heading ${align === "center" ? "is-center" : ""}`}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </header>
  )
}

export function CopyButton({
  value,
  label = "Copy command",
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      className="icon-button"
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      <span className="copy-label">{copied ? "Copied" : "Copy"}</span>
    </button>
  )
}
