// Send one GA4 event. A no-op when gtag is missing (analytics off, wrong host, ad blocker); never throws.
import type {EventParams} from './events';

type Gtag = ((command: 'event', name: string, params?: EventParams) => void) & ((command: 'set', params: EventParams) => void);

function gtag(): Gtag | null {
  const g = (globalThis as unknown as {window?: {gtag?: unknown}}).window?.gtag;
  return typeof g === 'function' ? (g as Gtag) : null;
}

export function track(name: string, params: EventParams = {}): void {
  try {
    gtag()?.('event', name, params);
  } catch {
    // Analytics must never break the site.
  }
}

/** Set the page every later event belongs to (GA4 keeps it until the next set). */
export function setPage(params: EventParams): void {
  try {
    gtag()?.('set', params);
  } catch {
    // Analytics must never break the site.
  }
}
