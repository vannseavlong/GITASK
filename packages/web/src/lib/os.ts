// Pure OS detection for the Download section. No DOM access, so it is testable.

export type OsId = "mac" | "windows" | "linux" | "mobile" | "unknown"

export type DesktopOs = "mac" | "windows" | "linux"

export const DESKTOP_OS: readonly DesktopOs[] = ["mac", "windows", "linux"]

export const OS_LABEL: Record<DesktopOs, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
}

/**
 * Classify a visitor. `maxTouchPoints` is only used to tell an iPad (which
 * reports a "Macintosh" user agent) from a Mac.
 */
export function detectOs(
  userAgent: string,
  maxTouchPoints = 0,
  uaDataMobile?: boolean,
): OsId {
  // Client hints survive "Desktop site" mode, where the UA says X11; Linux.
  if (uaDataMobile === true) return "mobile"
  const ua = (userAgent || "").toLowerCase()
  if (!ua) return "unknown"
  // Phones and tablets first: an Android user agent also contains "Linux".
  if (/android|iphone|ipad|ipod|mobile/.test(ua)) return "mobile"
  if (/macintosh|mac os x/.test(ua)) return maxTouchPoints > 1 ? "mobile" : "mac"
  if (/windows|win32|win64/.test(ua)) return "windows"
  if (/cros/.test(ua)) return "unknown"
  if (/linux|x11|ubuntu|fedora|debian/.test(ua)) return "linux"
  return "unknown"
}

/** The one desktop OS to highlight, or null when every card stays equal. */
export function primaryOs(os: OsId): DesktopOs | null {
  return os === "mac" || os === "windows" || os === "linux" ? os : null
}

/** Windows gets the PowerShell form; macOS and Linux get the shell form. */
export function shellFor(os: DesktopOs): "powershell" | "shell" {
  return os === "windows" ? "powershell" : "shell"
}

/**
 * The install command for a downloaded file. The file name is checked by
 * release.ts before it gets here; the check is repeated so a bad name can
 * never become a copyable command.
 */
export function installFileCommand(os: DesktopOs, fileName: string): string | null {
  if (!/^[A-Za-z0-9._-]+\.vsix$/.test(fileName)) return null
  return shellFor(os) === "powershell"
    ? `code --install-extension .\\${fileName}`
    : `code --install-extension ./${fileName}`
}
