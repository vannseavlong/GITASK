import type {ReactNode} from 'react';
import {PageMetadata} from '@docusaurus/theme-common';
import LayoutProvider from '@theme/Layout/Provider';
import Landing from '../landing/Landing';

// The landing page ships its own navbar and footer (src/landing); docs keep the Docusaurus ones.
export default function Home(): ReactNode {
  return (
    <>
      <PageMetadata
        title="Kanban for your Tasks folder"
        description="A Kanban board for a plain-Markdown Tasks folder. One file per task, the folder is the status, git is the history. VS Code extension and CLI."
      />
      <LayoutProvider>
        <Landing />
      </LayoutProvider>
    </>
  );
}
