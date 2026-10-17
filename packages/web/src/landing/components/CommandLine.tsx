import { CheckCircle2, Terminal } from "lucide-react"
import { commands } from "../content"
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
              "Inspect your board from any terminal.",
              "Move and create tasks without opening an editor.",
              "Review changes through Git history.",
            ].map((item) => (
              <li key={item}>
                <CheckCircle2 size={17} />
                {item}
              </li>
            ))}
          </ul>
          <div className="availability-note">
            <strong>CLI package publishing is not yet confirmed.</strong> Build
            and run it from the repository for now.
          </div>
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
              </div>
            ))}
          </div>
          <div className="terminal-install">
            <div>
              <span>Planned npm install</span>
              <code>npm i -g gitask-cli</code>
            </div>
            <CopyButton value="npm i -g gitask-cli" />
          </div>
        </div>
      </div>
    </section>
  )
}
