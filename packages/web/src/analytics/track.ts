// Send one GA4 event. A no-op when gtag is missing (analytics off, wrong host, ad blocker); never throws.
import type {EventParams} from './events';

type Gtag = (command: 'event', name: string, params?: EventParams) => void;

export function track(name: string, params: EventParams = {}): void {
  try {
    const gtag = (window as unknown as {gtag?: Gtag}).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
  } catch {
    // Analytics must never break the site.
  }
}
