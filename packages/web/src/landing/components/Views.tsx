import { CheckCircle2, Clock3 } from "lucide-react"
import { views } from "../content"
import { SectionHeading } from "./Shared"

function Thumbnail({ type }: { type: string }) {
  return (
    <div className={`view-thumbnail thumb-${type}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}

export default function Views() {
  return (
    <section className="section" id="views">
      <div className="container">
        <SectionHeading
          eyebrow="Views"
          title="Every way to see your work"
          text="Start with the live board today. The remaining views are clearly mapped, not passed off as finished features."
        />
        <div className="views-grid">
          {views.map((view) => (
            <article
              className={`view-card ${view.status === "Live" ? "is-live" : ""}`}
              key={view.title}
            >
              <Thumbnail type={view.type} />
              <div className="view-copy">
                <div>
                  <h3>{view.title}</h3>
                  <span
                    className={`status ${view.status === "Live" ? "live" : ""}`}
                  >
                    {view.status === "Live" ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock3 size={13} />
                    )}
                    {view.status}
                  </span>
                </div>
                <p>{view.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
