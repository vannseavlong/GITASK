import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'install',
    'getting-started',
    'task-format',
    'views',
    {type: 'category', label: 'Guides', collapsed: false, items: ['people-and-subtasks', 'report', 'serve', 'github-sync']},
    {type: 'category', label: 'Reference', collapsed: false, items: ['cli', 'faq']},
  ],
};

export default sidebars;
