import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const BOARD = [
  {name: 'Todo', cards: [{t: 'Web-login-page', tier: 'T2'}, {t: 'Core-export', tier: 'T1'}]},
  {name: 'In progress', cards: [{t: 'Ops-publish-prep', tier: 'T3'}]},
  {name: 'Done', cards: [{t: 'CLI-gitask', tier: 'T1'}, {t: 'Core-changelog', tier: 'T1'}]},
];

const FEATURES = [
  {
    title: 'Folder is the status',
    text: 'Drag a card and GITASK runs git mv. There is no status field to drift out of date.',
  },
  {
    title: 'Git is the history',
    text: 'Each move commits that one task file. No accounts, no server, no database.',
  },
  {
    title: 'Made for people and agents',
    text: 'Plain Markdown that humans and coding agents read and write with the same rules.',
  },
  {
    title: 'VS Code and a CLI',
    text: 'The board in your editor, and gitask board, move, new and changelog in any terminal.',
  },
];

const VIEWS = [
  {name: 'Board', text: 'Columns from your numbered folders, drag to move.', soon: false},
  {name: 'Task detail', text: 'Read a task rendered, tick its sub-tasks.', soon: true},
  {name: 'List', text: 'Sort, filter and search every task in a table.', soon: true},
  {name: 'Timeline', text: 'Calendar and waterfall with dependencies.', soon: true},
  {name: 'Overview', text: 'Counts, stale tasks, overdue and recent moves.', soon: true},
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div>
          <Heading as="h1" className={styles.title}>
            Kanban for your Tasks folder.
          </Heading>
          <p className={styles.lead}>
            One Markdown file per task, the folder is the status, git is the history. In VS Code and
            on the command line.
          </p>
          <div className={styles.actions}>
            <Link className="btn-primary" to="#download">
              Download
            </Link>
            <Link className="btn-secondary" to="/docs/intro">
              Read the docs
            </Link>
          </div>
        </div>
        <div className={styles.board} role="img" aria-label="Illustration of a three-column Kanban board">
          {BOARD.map((col) => (
            <div key={col.name} className={styles.col}>
              <h3>{col.name}</h3>
              {col.cards.map((c) => (
                <div key={c.t} className={styles.card}>
                  {c.t}
                  <br />
                  <span className={styles.tier}>{c.tier}</span>
                </div>
              ))}
            </div>
          ))}
          <p className={styles.caption}>Illustration. A real screenshot replaces this.</p>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Kanban for your Tasks folder"
      description="GITASK turns a plain-Markdown Tasks folder into a Kanban board in VS Code and a command line. Git is the history. Free and open source."
    >
      <Hero />
      <main>
        <section className={styles.section}>
          <div className={styles.wrap}>
            <Heading as="h2" className={styles.heading}>
              Why GITASK
            </Heading>
            <div className={styles.grid}>
              {FEATURES.map((f) => (
                <div key={f.title} className={styles.tile}>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.wrap}>
            <Heading as="h2" className={styles.heading}>
              Every way to see your work
            </Heading>
            <p className={styles.sub}>The same task files, shown the way you need them.</p>
            <div className={styles.grid}>
              {VIEWS.map((v) => (
                <div key={v.name} className={styles.tile}>
                  <h3>
                    {v.name}
                    {v.soon && <span className={styles.soon}>Coming soon</span>}
                  </h3>
                  <p>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.wrap}>
            <Heading as="h2" className={styles.heading}>
              How it works
            </Heading>
            <ol className={styles.steps}>
              <li>
                <h3>Keep tasks as files</h3>
                <p>
                  <code>Tasks/2-todo/Web-login-page.md</code> is a task. Its folder is its status.
                </p>
              </li>
              <li>
                <h3>Move a card</h3>
                <p>GITASK runs git mv, updates the date and commits that file only.</p>
              </li>
              <li>
                <h3>Read the history</h3>
                <p>Every move is a commit. Share the board by pushing the repo.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.wrap}>
            <Heading as="h2" id="download" className={styles.heading}>
              Download
            </Heading>
            <div className={styles.download}>
              {/* Replaced by the live download cards in Ops-web-downloads. */}
              <p>
                Install from the <Link href="https://marketplace.visualstudio.com/search?term=gitask">VS Code
                Marketplace</Link>, or on the command line:
              </p>
              <pre>
                <code>npm i -g gitask-cli</code>
              </pre>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
