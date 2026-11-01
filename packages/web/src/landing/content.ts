export const links = {
  repo: "https://github.com/vannseavlong/GITASK",
  issues: "https://github.com/vannseavlong/GITASK/issues",
  releases: "https://github.com/vannseavlong/GITASK/releases/latest",
  marketplace:
    "https://marketplace.visualstudio.com/items?itemName=vannseavlong.gitask-vscode",
  openVsx: "https://open-vsx.org/extension/vannseavlong/gitask-vscode",
  npm: "https://www.npmjs.com/package/gitask-cli",
  docs: "/docs/intro",
  portfolio: "https://vann-seavlong.vercel.app/",
} as const

export const navItems = [
  { label: "Features", href: "#features" },
  { label: "What's new", href: "#whats-new" },
  { label: "Views", href: "#views" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Download", href: "#download" },
  { label: "Docs", href: links.docs },
] as const

export const features = [
  {
    icon: "folder",
    title: "Folder is the status",
    text: "Drag a card and GITASK runs git mv. There is no status field to drift out of date.",
  },
  {
    icon: "git",
    title: "Git is the history",
    text: "Each move commits that one task file. No accounts, no server, no database.",
  },
  {
    icon: "bot",
    title: "Made for people and agents",
    text: "Plain Markdown that humans and coding agents read and write with the same rules.",
  },
  {
    icon: "terminal",
    title: "VS Code and a CLI",
    text: "The board in your editor, or in a browser with gitask serve. Every action also works from the terminal.",
  },
] as const

export const views = [
  {
    title: "Board",
    status: "Live",
    text: "Columns from your numbered folders, drag to move.",
    type: "board",
  },
  {
    title: "Task detail",
    status: "Live",
    text: "Read a task rendered, tick its sub-tasks.",
    type: "detail",
  },
  {
    title: "List",
    status: "Live",
    text: "Sort, filter and search every task in a table.",
    type: "list",
  },
  {
    title: "Timeline",
    status: "Live",
    text: "Calendar and waterfall with dependencies.",
    type: "timeline",
  },
  {
    title: "Overview",
    status: "Live",
    text: "Counts, stale tasks, overdue and recent moves.",
    type: "overview",
  },
] as const

export const commands = [
  "gitask board",
  "gitask assign Web-login-page sam-lee",
  "gitask subtask add Web-login-page \"Build login API\" --assign sam-lee",
  "gitask report --format md --from 2026-10-01",
  "gitask serve",
] as const

export const extensionId = "vannseavlong.gitask-vscode"

export const installCommand = `code --install-extension ${extensionId}`

export const whatsNew = {
  version: "0.5.0",
  items: [
    {
      icon: "users",
      title: "People and sub-tasks",
      text: "Assign an owner, split a task into checkbox sub-tasks and give each one a person and a lane.",
    },
    {
      icon: "report",
      title: "Done reports",
      text: "Export what each person finished as HTML, Markdown or CSV, with a live preview.",
    },
    {
      icon: "browser",
      title: "Board in your browser",
      text: "gitask serve opens the same board on localhost, protected by a one-time token.",
    },
    {
      icon: "github",
      title: "GitHub Issues sync",
      text: "Opt in, see a dry run, then create issues so assignees are notified. It never pushes.",
    },
  ],
} as const

export const cliCommands = [
  { command: "gitask init", text: "Create a Tasks/ folder with the six status folders." },
  { command: "gitask people", text: "List contributors; add --json for scripts.", isNew: true },
  { command: "gitask assign <task> <person>", text: "Set or clear a task owner.", isNew: true },
  { command: "gitask subtask add|assign|list", text: "Manage a task's checkboxes.", isNew: true },
  { command: "gitask report --format md", text: "Done report by person, to stdout or a file.", isNew: true },
  { command: "gitask serve", text: "The board in your browser, local and token-protected.", isNew: true },
  { command: "gitask github plan | sync", text: "Dry-run, then sync tasks to GitHub Issues.", isNew: true },
  { command: "gitask board | move | new | changelog", text: "The core commands from earlier releases." },
] as const

export interface BoardCard {
  title: string
  tier: string
  owner: string
  progress: number
  column: number
  dragging?: boolean
}

export const boardCards: readonly BoardCard[] = [
  { title: "Web-login-page", tier: "T2", owner: "SL", progress: 40, column: 0 },
  { title: "Core-export", tier: "T1", owner: "VN", progress: 20, column: 0 },
  {
    title: "Ops-publish-prep",
    tier: "T3",
    owner: "AK",
    progress: 64,
    column: 1,
    dragging: true,
  },
  { title: "CLI-gitask", tier: "T1", owner: "SL", progress: 80, column: 1 },
  {
    title: "Core-changelog",
    tier: "T1",
    owner: "VN",
    progress: 100,
    column: 2,
  },
] as const
