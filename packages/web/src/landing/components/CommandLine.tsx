import { CheckCircle2, Terminal } from "lucide-react"
import { commands, links } from "../content"
import { CopyButton } from "./Shared"

export default function CommandLine() {
  return (
    <section className="section section-alt" id="command-line">
      <div className="container cli-grid">
        <div className="cli-copy">
          <span className="eyebrow">Command line</span>
          <h2>Same board, no editor needed</h2>
          <p>
            The CLI reads the same task files and uses the same core behavior as
            the extension.
          </p>
          <ul className="benefit-list">
            {[
              "Assign people and sub-tasks without opening an editor.",
              "Export a done report for any period.",
              "Open the board in a browser with gitask serve.",
            ].map((item) => (
              <li key={item}>
                <CheckCircle2 size={17} />
                {item}
              </li>
            ))}
          </ul>
          <a className="text-link" href={links.docs}>
            Read the CLI reference →
          </a>
        </div>
        <div className="terminal">
          <div className="terminal-bar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <span>
              <Terminal size={14} /> illustrative session
            </span>
            <span />
          </div>
          <div className="terminal-body">
            {commands.map((command, index) => (
              <div className="terminal-line" key={command}>
                <code>
                  <b>$</b> {command}
                </code>
                {index === 0 && (
                  <small>
                    2-todo&nbsp;&nbsp;&nbsp; Web-login-page, Core-export
                    <br />
                    3-in-progress&nbsp;&nbsp; CLI-gitask
                  </small>
                )}
                {index === commands.length - 1 && (
                  <small>Board at http://127.0.0.1:4173/?token=…</small>
                )}
              </div>
            ))}
          </div>
          <div className="terminal-install">
            <div>
              <span>Install from npm</span>
              <code>npm i -g gitask-cli</code>
            </div>
            <CopyButton value="npm i -g gitask-cli" />
          </div>
        </div>
      </div>
    </section>
  )
}
