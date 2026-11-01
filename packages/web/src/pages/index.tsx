import type {ReactNode} from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {PageMetadata} from '@docusaurus/theme-common';
import LayoutProvider from '@theme/Layout/Provider';
import Landing from '../landing/Landing';

const TITLE = 'Kanban for Markdown tasks in VS Code';
const DESCRIPTION =
  'A git-based task board for a plain-Markdown Tasks folder. One file per task, the folder is the status, git is the history. Free VS Code extension and CLI.';

// The landing page ships its own navbar and footer (src/landing); docs keep the Docusaurus ones.
export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const base = siteConfig.url + siteConfig.baseUrl.replace(/\/$/, '');
  // Only values that are true today. No version: the release pages carry it.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GITASK',
    description: DESCRIPTION,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Windows, macOS, Linux',
    url: `${base}/`,
    downloadUrl: 'https://github.com/vannseavlong/GITASK/releases/latest',
    image: `${base}/img/og.png`,
    offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
  };
  return (
    <>
      <PageMetadata title={TITLE} description={DESCRIPTION}>
        <link rel="canonical" href={`${base}/`} />
        <meta property="og:url" content={`${base}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${base}/img/og.png`} />
        <meta name="twitter:image" content={`${base}/img/og.png`} />
      </PageMetadata>
      <Head>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>
      <LayoutProvider>
        <Landing />
      </LayoutProvider>
    </>
  );
}
