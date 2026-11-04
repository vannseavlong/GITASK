import type { ProjectLayout } from "gitask-core";

/** What the dialog sends: only the fields that differ from the saved project. Empty means there is nothing to save. */
export interface ProjectChanges {
  title?: string | null;
  subtitle?: string | null;
  layout?: Partial<ProjectLayout>;
  logo?: null | { name: string; data: string };
}

export interface ProjectDraft {
  title: string;
  subtitle: string;
  layout: ProjectLayout;
  logo: { kind: "keep" } | { kind: "remove" } | { kind: "new"; name: string; data: string };
}

/**
 * The fields of `draft` that differ from `current` (`layout` is the saved layout with defaults already applied).
 * Text is trimmed and an empty text clears the field (`null`). Removing a logo that does not exist is not a change.
 */
export function projectChanges(current: { title?: string; subtitle?: string; layout: ProjectLayout; hasLogo: boolean }, draft: ProjectDraft): ProjectChanges {
  const out: ProjectChanges = {};
  const title = draft.title.trim();
  const subtitle = draft.subtitle.trim();
  if (title !== (current.title ?? "")) out.title = title || null;
  if (subtitle !== (current.subtitle ?? "")) out.subtitle = subtitle || null;
  const layout: Partial<ProjectLayout> = {};
  for (const k of Object.keys(draft.layout) as (keyof ProjectLayout)[]) {
    if (draft.layout[k] !== current.layout[k]) (layout as Record<string, unknown>)[k] = draft.layout[k];
  }
  if (Object.keys(layout).length) out.layout = layout;
  if (draft.logo.kind === "new") out.logo = { name: draft.logo.name, data: draft.logo.data };
  else if (draft.logo.kind === "remove" && current.hasLogo) out.logo = null;
  return out;
}

export const hasChanges = (c: ProjectChanges): boolean => Object.keys(c).length > 0;

/** The host's answer to `setProject`, checked before the dialog trusts it (anything else is ignored). */
export function projectSavedReply(m: unknown): { ok: true } | { ok: false; error: string } | undefined {
  if (!m || typeof m !== "object") return undefined;
  const r = m as { type?: unknown; ok?: unknown; error?: unknown };
  if (r.type !== "projectSaved" || typeof r.ok !== "boolean") return undefined;
  if (r.ok) return { ok: true };
  return { ok: false, error: typeof r.error === "string" && r.error ? r.error.slice(0, 300) : "Could not save the header." };
}
