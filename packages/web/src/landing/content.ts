export const links = {
  repo: "https://github.com/vannseavlong/GITASK",
  issues: "https://github.com/vannseavlong/GITASK/issues",
  releases: "https://github.com/vannseavlong/GITASK/releases/latest",
  openVsx: "https://open-vsx.org/extension/vannseavlong/gitask-vscode",
  docs: "/docs/intro",
} as const

export const navItems = [
  { label: "Features", href: "#features" },
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
    text: "The board in your editor, and gitask board, move, new and changelog in any terminal.",
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
    status: "Coming soon",
    text: "Read a task rendered, tick its sub-tasks.",
    type: "detail",
  },
  {
    title: "List",
    status: "Coming soon",
    text: "Sort, filter and search every task in a table.",
    type: "list",
  },
  {
    title: "Timeline",
    status: "Coming soon",
    text: "Calendar and waterfall with dependencies.",
    type: "timeline",
  },
  {
    title: "Overview",
    status: "Coming soon",
    text: "Counts, stale tasks, overdue and recent moves.",
    type: "overview",
  },
] as const

export const commands = [
  "gitask board",
  "gitask move Web-login-page 3-in-progress",
  "gitask new Core-export",
  "gitask changelog Core-changelog",
] as const

export const installCommand = (file = "<downloaded-file.vsix>") =>
  `code --install-extension ${file}`

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
