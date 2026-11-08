import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FieldDef, FieldValueDef } from "./types.ts";
import { CONFIG_FILE, isColor } from "./config.ts";
import { assertRegularFile } from "./taskfile.ts";
import { cleanText } from "./project-rules.ts";
import { RESERVED_FIELD_KEYS, isFieldKey, isFieldValueId } from "./field-rules.ts";

export const MAX_FIELDS = 8;
export const MAX_FIELD_VALUES = 30;
export const MAX_FIELD_LABEL = 40;

export { RESERVED_FIELD_KEYS, isFieldKey, isFieldValueId };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function parseValues(raw: unknown): FieldValueDef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FieldValueDef[] = [];
  for (const v of raw) {
    if (out.length >= MAX_FIELD_VALUES) break;
    if (!isRecord(v) || !isFieldValueId(v.id) || seen.has(v.id)) continue;
    const label = cleanText(v.label, MAX_FIELD_LABEL, "label", false) ?? v.id;
    seen.add(v.id);
    out.push({ id: v.id, label, ...(isColor(v.color) ? { color: v.color.toLowerCase() } : {}) });
  }
  return out;
}

/**
 * Parse the `fields` block of `Tasks/gitask.json`. Each entry is checked alone: a bad entry (wrong key, reserved or
 * duplicate key, no valid value) is dropped, a bad value is dropped from its field, the rest is kept. Never throws.
 */
export function parseFields(text: string): FieldDef[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const raw = isRecord(json) ? json.fields : undefined;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FieldDef[] = [];
  for (const f of raw) {
    if (out.length >= MAX_FIELDS) break;
    if (!isRecord(f) || !isFieldKey(f.key) || seen.has(f.key)) continue;
    const values = parseValues(f.values);
    if (!values.length) continue;
    seen.add(f.key);
    out.push({
      key: f.key,
      label: cleanText(f.label, MAX_FIELD_LABEL, "label", false) ?? f.key,
      multi: f.multi === true,
      values,
    });
  }
  return out;
}

/** Configured fields of `<dir>/gitask.json`; `[]` when the file is missing, unreadable, a symlink or malformed. */
export async function readFields(dir: string): Promise<FieldDef[]> {
  try {
    const file = join(dir, CONFIG_FILE);
    await assertRegularFile(file, dir);
    return parseFields(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}
