import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Final production URL is set in Ops-web-deploy; one value, used for canonicals and the sitemap.
const SITE_URL = 'https://gitask-me.web.app';
const DESCRIPTION =
  'GITASK is a Kanban board for a plain-Markdown Tasks folder, in VS Code and on the command line. One file per task, the folder is the status, git is the history.';
const THEME_COLOR = '#3b82f6'; // --brand-primary in src/css/custom.css
const REPO = 'https://github.com/vannseavlong/GITASK';

const config: Config = {
  title: 'GITASK',
  tagline: 'A Kanban board for your Tasks folder. Git is the history.',
  favicon: 'img/favicon-32.png',
  url: SITE_URL,
  baseUrl: '/',
  organizationName: 'vannseavlong',
  projectName: 'GITASK',
  onBrokenLinks: 'throw',
  markdown: {hooks: {onBrokenMarkdownLinks: 'throw'}},
  headTags: [
    {tagName: 'link', attributes: {rel: 'apple-touch-icon', href: '/img/apple-touch-icon.png'}},
    {tagName: 'link', attributes: {rel: 'manifest', href: '/site.webmanifest'}},
  ],
  i18n: {defaultLocale: 'en', locales: ['en']},

  plugins: [
    // robots.txt is generated so the sitemap URL comes from SITE_URL, the one place the host is set.
    function robotsTxt() {
      return {
        name: 'gitask-robots-txt',
        async postBuild({outDir}: {outDir: string}) {
          const {writeFile} = await import('node:fs/promises');
          await writeFile(`${outDir}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
        },
      };
    },
  ],

  themes: [
    // Local search: index built at build time, no account or external service.
    [
      '@easyops-cn/docusaurus-search-local',
      {hashed: true, docsRouteBasePath: '/docs', indexBlog: false, indexPages: false, highlightSearchTermsOnTargetPage: true},
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {sidebarPath: './sidebars.ts', routeBasePath: 'docs'},
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/og.png',
    metadata: [
      {name: 'description', content: DESCRIPTION},
      {name: 'theme-color', content: THEME_COLOR},
      {name: 'twitter:card', content: 'summary_large_image'},
      {property: 'og:image:width', content: '1200'},
      {property: 'og:image:height', content: '630'},
      {property: 'og:image:alt', content: 'The GITASK Kanban board showing the tasks of a Tasks folder'},
    ],
    colorMode: {defaultMode: 'dark', respectPrefersColorScheme: false},
    navbar: {
      title: 'GITASK',
      logo: {alt: 'GITASK logo', src: 'img/icon.png'},
      items: [
        {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
        {href: '/#download', label: 'Download', position: 'left'},
        {href: REPO, label: 'GitHub', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Get GITASK',
          items: [
            {label: 'Download', href: '/#download'},
            {label: 'Documentation', to: '/docs/intro'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: REPO},
            {label: 'Issues', href: `${REPO}/issues`},
            {label: 'npm: gitask-cli', href: 'https://www.npmjs.com/package/gitask-cli'},
          ],
        },
      ],
      copyright: `MIT License · © ${new Date().getFullYear()} GITASK`,
    },
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
