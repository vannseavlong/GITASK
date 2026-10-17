import { ArrowRight, FileCode2, Folder, GitFork } from "lucide-react"
import { boardCards, links } from "../content"

function BoardIllustration() {
  const columns = ["Todo", "In progress", "Done"]
  return (
    <figure
      className="editor-window"
      aria-label="Illustrative GITASK board inside VS Code"
    >
      <figcaption>Illustrative product preview</figcaption>
      <div className="editor-titlebar">
        <span className="traffic">
          <i />
          <i />
          <i />
        </span>
        <span>GITASK — Visual Studio Code</span>
        <span />
      </div>
      <div className="editor-body">
        <aside className="file-sidebar">
          <strong>EXPLORER</strong>
          <div>
            <Folder size={13} /> Tasks
          </div>
          {["1-backlog", "2-todo", "3-in-progress", "4-testing", "5-done"].map(
            (folder) => (
              <div className="tree-item" key={folder}>
                <Folder size={12} /> {folder}
              </div>
            ),
          )}
        </aside>
        <div className="board-area">
          <div className="board-toolbar">
            <span>Board</span>
            <small>Tasks/</small>
          </div>
          <div className="board-columns">
            {columns.map((column, index) => (
              <div className="board-column" key={column}>
                <div className="column-title">
                  <span>{column}</span>
                  <b>
                    {boardCards.filter((card) => card.column === index).length}
                  </b>
                </div>
                {boardCards
                  .filter((card) => card.column === index)
                  .map((card) => (
                    <div
                      className={`task-card ${
                        card.dragging ? "is-dragging" : ""
                      }`}
                      key={card.title}
                    >
                      <div className="task-file">
                        <FileCode2 size={13} /> {card.title}
                      </div>
                      <div className="task-meta">
                        <span className="tier">{card.tier}</span>
                        <span className="owner">{card.owner}</span>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${card.progress}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <a
            className="badge"
            href={links.repo}
            target="_blank"
            rel="noreferrer"
          >
            <GitFork size={14} /> Free and open source
          </a>
          <h1>
            Kanban for your <span>Tasks folder.</span>
          </h1>
          <p>
            One Markdown file per task, the folder is the status, git is the
            history. In VS Code and on the command line.
          </p>
          <div className="button-row">
            <a className="button primary" href="#download">
              Download <ArrowRight size={16} />
            </a>
            <a className="button secondary" href={links.docs}>
              Read the docs
            </a>
          </div>
          <small className="compatibility">
            VS Code 1.85+ · Node 20+ for the CLI · macOS, Windows, Linux
          </small>
        </div>
        <BoardIllustration />
      </div>
    </section>
  )
}
