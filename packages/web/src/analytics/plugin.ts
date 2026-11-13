// Docusaurus plugin that adds Google Analytics 4 (the Analytics behind Firebase) to production builds.
// We use this instead of the preset's gtag plugin so that:
// - gtag.js only loads on the real site host, never on localhost, the preview channel or a fork;
// - "#section" jumps on the landing page are not counted as page views;
// - Google signals and ad personalisation are off (no consent banner, so no cross-site data);
// - page_location and page_referrer never carry a query string or hash, and the search page title
//   (which contains the query) is replaced with "Search".
// Event code lives in ./client.ts; what gets sent is decided in ./events.ts.
import type {LoadContext, Plugin} from '@docusaurus/types';

/** GA4 web measurement ids look like G-XXXXXXXXXX. Checked because the id is written into an inline script. */
const MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/;
const HOSTNAME = /^[a-z0-9.-]+$/;

export type AnalyticsOptions = {
  /** GA4 measurement id. Empty turns analytics off. */
  measurementId: string;
  /** The only hostname that sends data, e.g. "gitask-me.web.app". */
  hostname: string;
};

export function isValidMeasurementId(id: string): boolean {
  return MEASUREMENT_ID.test(id);
}

/** The inline head script: a host check, then the standard gtag bootstrap with privacy settings. */
export function headScript({measurementId, hostname}: AnalyticsOptions): string {
  if (!isValidMeasurementId(measurementId)) throw new Error(`analytics: invalid GA4 measurement id "${measurementId}"`);
  if (!HOSTNAME.test(hostname)) throw new Error(`analytics: invalid hostname "${hostname}"`);
  const id = JSON.stringify(measurementId);
  const host = JSON.stringify(hostname);
  return `(function(){
if (location.hostname !== ${host}) return;
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
var ref = '';
try { if (document.referrer) { var r = new URL(document.referrer); ref = r.origin + r.pathname; } } catch (e) {}
var page = {page_location: location.origin + location.pathname, page_referrer: ref};
if (/^\\/search\\/?$/.test(location.pathname)) page.page_title = 'Search';
gtag('set', page);
gtag('config', ${id}, {allow_google_signals: false, allow_ad_personalization_signals: false});
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(${id});
document.head.appendChild(s);
})();`;
}

export default function analyticsPlugin(_context: LoadContext, options: AnalyticsOptions): Plugin | null {
  // Dev server (`docusaurus start`) and an empty id: no tag, no client code.
  if (process.env.NODE_ENV !== 'production' || !options.measurementId) return null;
  const script = headScript(options);
  return {
    name: 'gitask-analytics',
    getClientModules() {
      return [require.resolve('./client')];
    },
    injectHtmlTags() {
      return {headTags: [{tagName: 'script', innerHTML: script}]};
    },
  };
}
