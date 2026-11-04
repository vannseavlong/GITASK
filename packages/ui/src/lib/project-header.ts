import type { ProjectLayout } from "gitask-core";

/** Tailwind classes for each layout option. Pure, so `packages/vscode/test/project-header.test.ts` can check every combination. */
export interface HeaderClasses {
  /** The header row/column: direction and where the content sits. */
  root: string;
  /** The text block (title, subtitle). */
  text: string;
  logo: string;
  title: string;
  subtitle: string;
}

const ALIGN_ROW = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;
const ALIGN_COL = { left: "items-start", center: "items-center", right: "items-end" } as const;
const ALIGN_TEXT = { left: "text-left", center: "text-center", right: "text-right" } as const;
const LOGO = { sm: "h-6 max-w-24", md: "h-10 max-w-40", lg: "h-16 max-w-64" } as const;
const TITLE = { sm: "text-base", md: "text-xl", lg: "text-3xl" } as const;
const SUB = { sm: "text-xs", md: "text-sm", lg: "text-base" } as const;

export function headerClasses(l: ProjectLayout): HeaderClasses {
  const top = l.logoPosition === "top";
  const dir = top ? `flex-col ${ALIGN_COL[l.align]}` : `${l.logoPosition === "right" ? "flex-row-reverse" : "flex-row"} items-center ${ALIGN_ROW[l.align]}`;
  return {
    root: `flex min-w-0 gap-3 ${dir}`,
    text: `min-w-0 ${ALIGN_TEXT[l.align]}`,
    logo: `${LOGO[l.size]} w-auto shrink-0 object-contain`,
    title: `${TITLE[l.size]} font-semibold leading-tight break-words`,
    subtitle: `${SUB[l.size]} text-muted-foreground break-words`,
  };
}

/** What the header shows. `null` means render nothing (no project, or every part hidden). */
export function headerParts(p: { title?: string; subtitle?: string; logo?: unknown; layout: ProjectLayout } | undefined, logoFailed: boolean): { title?: string; subtitle?: string; logo: boolean } | null {
  if (!p) return null;
  const title = p.layout.showTitle ? p.title : undefined;
  const logo = !!p.logo && p.layout.logoPosition !== "hidden" && !logoFailed;
  if (!title && !p.subtitle && !logo) return null;
  return { title, subtitle: p.subtitle, logo };
}
