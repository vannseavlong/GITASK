// Browser side of the analytics plugin: page views on route change and a few delegated listeners.
// Every call is a no-op when gtag is missing (wrong host, ad blocker), and nothing here may break the page.
import type {ClientModule} from '@docusaurus/types';
import {eventsForLink, isNewPage, linkText, pageTitle, searchEvent, cleanText, type AnalyticsEvent} from './events';
import {setPage, track} from './track';

function send(event: AnalyticsEvent | null): void {
  if (event) track(event.name, event.params);
}

/** Where on the page a click happened: a landing section id, or the page area. */
function sectionOf(el: Element): string {
  const section = el.closest('section');
  if (section?.id) return section.id;
  if (section?.classList.contains('hero')) return 'hero';
  if (section?.classList.contains('final-section')) return 'final_cta';
  if (el.closest('nav, .navbar')) return 'navbar';
  if (el.closest('footer')) return 'footer';
  if (el.closest('article, .theme-doc-markdown')) return 'doc';
  return 'page';
}

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target?.closest) return;

  const link = target.closest('a[href]') as HTMLAnchorElement | null;
  if (link) {
    eventsForLink({
      href: link.getAttribute('href') ?? '',
      pageUrl: location.href,
      text: linkText(link.textContent, link.getAttribute('aria-label')),
      isButton: link.classList.contains('button'),
      section: sectionOf(link),
    }).forEach(send);
    return;
  }

  // Docusaurus code block copy button (docs pages). Landing copy buttons report from CopyButton.
  // The button has no stable class, so match its label inside a code block (the site is English only).
  const button = target.closest('button');
  const block = button?.closest('.theme-code-block');
  if (button && block && /copy/i.test(button.getAttribute('aria-label') ?? button.title)) {
    const language = /language-([\w-]+)/.exec(block.className)?.[1];
    track('copy_code', {language: cleanText(language, 30) || 'text'});
  }
}

// Navbar search (docusaurus-search-local): send the term once typing pauses, with whether it found anything.
let searchTimer: number | undefined;
let lastSearch = '';
function onInput(e: Event): void {
  const input = e.target as HTMLInputElement | null;
  if (!input?.matches?.('.navbar__search-input')) return;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    // The dropdown renders "No results" with a hashed CSS-module class that keeps "noResults" in its name.
    const noResults = document.querySelector('[class*="noResults"]') !== null;
    const event = searchEvent(input.value, 'navbar', !noResults);
    if (event && event.params.search_term !== lastSearch) {
      lastSearch = String(event.params.search_term);
      send(event);
    }
  }, 1200);
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', onClick, {capture: true});
  document.addEventListener('input', onInput, {capture: true});
}

const clientModule: ClientModule = {
  onRouteDidUpdate({location, previousLocation}) {
    if (!isNewPage(location, previousLocation)) return;
    // Docusaurus sets the new title on the next tick; wait so page_view carries the right one.
    window.setTimeout(() => {
      // "set" first: later clicks and searches on this page then report this page, not the first one.
      const page = {
        page_location: `${window.location.origin}${location.pathname}`,
        page_title: pageTitle(location.pathname, document.title),
      };
      setPage(page);
      track('page_view', page);
      if (location.pathname.replace(/\/$/, '') === '/search') {
        const event = searchEvent(new URLSearchParams(location.search).get('q') ?? '', 'search_page');
        // Enter in the navbar search opens this page with the term already sent: send it once.
        if (event && event.params.search_term !== lastSearch) send(event);
        lastSearch = '';
      }
    });
  },
};

export default clientModule;
