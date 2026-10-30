// Pure helpers for the rendered task body. No vscode import.
const SUB_HEADING = /^##\s+sub-?tasks\b/i;
const ANY_H2 = /^##\s/;
const CHECKBOX = /^\s*[-*+]\s+\[[ xX]\]/;

/**
 * The detail panel shows the `## Sub-tasks` checkboxes in its own section, so the markdown body hides them.
 * Lines are blanked, never removed, so the line numbers the remaining checkboxes bind to stay true.
 * Other sections (Done when, gate rows, ...) are untouched; code fences are skipped.
 */
export function hideSubtaskSection(text: string): string {
  let inSection = false;
  let fence = "";
  return text.split(/(\r?\n)/).map((part, i) => {
    if (i % 2 === 1) return part; // the separators
    const fm = /^\s*(`{3,}|~{3,})/.exec(part);
    if (fence) { if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = ""; return inSection ? "" : part; }
    if (fm) { fence = fm[1]; return inSection ? "" : part; }
    if (ANY_H2.test(part)) { inSection = SUB_HEADING.test(part); return inSection ? "" : part; }
    if (inSection && CHECKBOX.test(part)) return "";
    return part;
  }).join("");
}
