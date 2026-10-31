import { Download, FileBarChart, GitPullRequest, Globe, Users } from "lucide-react"
import { cliCommands, links, whatsNew } from "../content"
import { CopyButton, SectionHeading } from "./Shared"

const icons = {
  users: Users,
  report: FileBarChart,
  browser: Globe,
  github: GitPullRequest,
}

export default function WhatsNew() {
  return (
    <section className="section section-alt" id="whats-new">
      <div className="container">
        <SectionHeading
          eyebrow={`New in ${whatsNew.version}`}
          title="Plan the work, then report on it."
          text="People, sub-tasks, reports, a browser board and GitHub sync, in the extension and the CLI."
        />
        <div className="new-grid">
          {whatsNew.items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <article className="new-card" key={item.title}>
                <div className="icon-tile">
                  <Icon size={20} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            )
          })}
        </div>
        <div className="cli-table" role="table" aria-label="CLI commands">
          <div className="cli-table-head">
            <h3>CLI commands</h3>
            <a className="text-link" href={links.docs}>
              Full reference →
            </a>
          </div>
          {cliCommands.map((row) => (
            <div className="cli-row" role="row" key={row.command}>
              <code role="cell">{row.command}</code>
              <span role="cell">
                {row.text}
                {"isNew" in row && <em className="badge-new">New</em>}
              </span>
              <CopyButton
                value={row.command.split(" | ")[0].split("|")[0]}
                label={`Copy ${row.command}`}
              />
            </div>
          ))}
        </div>
        <p className="new-foot">
          <Download size={14} /> Update the extension from the Marketplace or run{" "}
          <code>npm i -g gitask-cli@latest</code>.
        </p>
      </div>
    </section>
  )
}
