import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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
  announce = false,
}: {
  value: string
  label?: string
  /** Add a polite live region that says "Copied" or why it failed. */
  announce?: boolean
}) {
  const [message, setMessage] = useState("")
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    let text = "Copied"
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      text = "Copy failed. Select the text and copy it by hand."
    }
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(""), 2500)
  }

  const copied = message === "Copied"
  return (
    <>
      <button
        className="icon-button"
        type="button"
        onClick={copy}
        aria-label={announce ? label : copied ? "Copied" : label}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        <span className="copy-label">{copied ? "Copied" : "Copy"}</span>
      </button>
      {announce && (
        <span className="sr-only" role="status" aria-live="polite">
          {message}
        </span>
      )}
    </>
  )
}
