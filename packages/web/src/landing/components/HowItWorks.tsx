import { ArrowRight, FileText, Folder, GitCommitHorizontal } from "lucide-react"
import { SectionHeading } from "./Shared"

export default function HowItWorks() {
  return (
    <section className="section section-alt" id="how-it-works">
      <div className="container">
        <SectionHeading
          eyebrow="How it works"
          title="A board made of ordinary files."
          text="GITASK adds a clear interface to a workflow Git already understands."
        />
        <div className="steps">
          <article className="step">
            <span className="step-number">01</span>
            <h3>Keep tasks as files</h3>
            <code className="inline-code">Tasks/2-todo/Web-login-page.md</code>
            <p>
              Each Markdown file represents a task. Its numbered folder
              determines its status.
            </p>
            <div className="mini-visual file-tree">
              <div>
                <Folder size={14} /> Tasks/
              </div>
              <div>
                <Folder size={14} /> 2-todo/
              </div>
              <div>
                <FileText size={14} /> Web-login-page.md
              </div>
            </div>
          </article>
          <article className="step">
            <span className="step-number">02</span>
            <h3>Move a card</h3>
            <p>
              GITASK moves the task with git mv, updates its Started / updated
              date, and commits that task file only.
            </p>
            <div className="mini-visual path-move">
              <code>2-todo/</code>
              <ArrowRight size={18} />
              <code>3-in-progress/</code>
              <small>git mv · one file</small>
            </div>
          </article>
          <article className="step">
            <span className="step-number">03</span>
            <h3>Read the history</h3>
            <p>
              Every move is a commit. Share the board by pushing the repository.
            </p>
            <div className="mini-visual git-log">
              <div className="terminal-label">
                <GitCommitHorizontal size={14} /> git log --oneline
              </div>
              <code>
                <b>81ac92e</b> task(Web-login-page): todo → in-progress
              </code>
              <code>
                <b>3f471aa</b> feat(cli): add board command
              </code>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
