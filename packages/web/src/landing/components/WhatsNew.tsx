import { Download, Filter, ListChecks, Tags, Terminal } from "lucide-react"
import { cliCommands, links, whatsNew } from "../content"
import { CopyButton, SectionHeading } from "./Shared"

const icons = {
  fields: Tags,
  filter: Filter,
  subtask: ListChecks,
  cli: Terminal,
}

export default function WhatsNew() {
  return (
    <section className="section section-alt" id="whats-new">
      <div className="container">
        <SectionHeading
          eyebrow={`New in ${whatsNew.version}`}
          title="Make the board fit your team."
          text="Define your own fields, such as Platform, and filter the board, the list and the CLI by them."
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
        <div className="cli-table">
          <div className="cli-table-head">
            <h3>CLI commands</h3>
            <a className="text-link" href={links.docs}>
              Full reference →
            </a>
          </div>
          <ul className="cli-list" aria-label="CLI commands">
            {cliCommands.map((row) => (
              <li className="cli-row" key={row.command}>
                <code>{row.command}</code>
                <span>
                  {row.text}
                  {"isNew" in row && <em className="badge-new">New</em>}
                </span>
                <CopyButton
                  value={row.command.split(" | ")[0].split("|")[0]}
                  label={`Copy ${row.command}`}
                />
              </li>
            ))}
          </ul>
        </div>
        <p className="new-foot">
          <Download size={14} /> Update the extension from the Marketplace or run{" "}
          <code>npm i -g gitask-cli@latest</code>.
        </p>
      </div>
    </section>
  )
}
