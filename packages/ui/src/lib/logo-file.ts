import { LOGO_TYPES, MAX_LOGO_BYTES } from "../../../core/src/project-rules.ts";

/** Why a picked file cannot be a logo, or `undefined` when it can. The host checks the content again. */
export function logoFileProblem(name: string, size: number): string | undefined {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || !Object.hasOwn(LOGO_TYPES, name.slice(dot + 1).toLowerCase())) return "Choose a png, jpg, webp, gif or svg image.";
  if (size === 0) return "That file is empty.";
  if (size > MAX_LOGO_BYTES) return `The logo must be at most ${MAX_LOGO_BYTES / 1024} KiB.`;
  return undefined;
}

/** Base64 of bytes, in chunks (one spread of 1 MiB overflows the call stack). */
export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
