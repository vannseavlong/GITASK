import { ArrowRight } from "lucide-react"
import { links } from "../content"

export default function FinalCta() {
  return (
    <section className="section final-section">
      <div className="container">
        <div className="final-cta">
          <div>
            <span className="eyebrow">Markdown in. Board out.</span>
            <h2>Your tasks are already files. Give them a board.</h2>
          </div>
          <div className="button-row">
            <a className="button primary" href="#download">
              Download <ArrowRight size={16} />
            </a>
            <a className="button secondary" href={links.docs}>
              Read the docs
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
