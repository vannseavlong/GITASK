import useBaseUrl from "@docusaurus/useBaseUrl"
import { CheckCircle2, Clock3 } from "lucide-react"
import { views } from "../content"
import { SectionHeading } from "./Shared"

function Shot({ image, alt }: { image: string; alt: string }) {
  const dark = useBaseUrl(`/img/views/${image}-dark.webp`)
  const light = useBaseUrl(`/img/views/${image}-light.webp`)
  return (
    <div className="view-shot">
      <img className="shot-dark" src={dark} alt={alt} width={1280} height={800} loading="lazy" decoding="async" />
      <img className="shot-light" src={light} alt={alt} width={1280} height={800} loading="lazy" decoding="async" />
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
          text="Board, task detail, list, timeline and overview ship in the VS Code extension today."
        />
        <div className="views-grid">
          {views.map((view) => (
            <article
              className="view-card"
              key={view.title}
            >
              <Shot image={view.image} alt={view.alt} />
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
