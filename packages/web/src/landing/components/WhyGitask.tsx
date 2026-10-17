import { Bot, FolderKanban, GitCommitHorizontal, Terminal } from "lucide-react"
import { features } from "../content"
import { SectionHeading } from "./Shared"

const icons = {
  folder: FolderKanban,
  git: GitCommitHorizontal,
  bot: Bot,
  terminal: Terminal,
}

export default function WhyGitask() {
  return (
    <section className="section" id="features">
      <div className="container">
        <SectionHeading
          eyebrow="Why GITASK"
          title="The repository is the system."
          text="Nothing to sync, export, or reconcile. Your task board stays as close to the work as the code itself."
        />
        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = icons[feature.icon]
            return (
              <article className="feature-card" key={feature.title}>
                <div className="feature-index">0{index + 1}</div>
                <div className="icon-tile">
                  <Icon size={20} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
