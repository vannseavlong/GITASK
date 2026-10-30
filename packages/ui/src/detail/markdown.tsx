import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Only http(s) links survive; every other target is shown as plain text. */
export function safeHref(url: string | undefined): string | null {
  return url && /^https?:\/\/[^\s<>"'`\\\u0000-\u001f\u007f]+$/i.test(url) ? url : null;
}

/** Line of the checkbox being rendered, so the box can find its sub-task. */
const LineContext = React.createContext<number | null>(null);

export interface SubtaskBinding {
  /** Called with the file line of a rendered checkbox: the sub-task state, or null when there is none. */
  find(line: number): { checked: boolean; text: string } | null;
  toggle(line: number): void;
}

export function Markdown({ text, subtasks }: { text: string; subtasks: SubtaskBinding }) {
  const components = React.useMemo<Components>(() => ({
    a({ href, children }) {
      const ok = safeHref(href);
      return ok ? <a href={ok} rel="noreferrer noopener">{children}</a> : <span>{children}</span>;
    },
    img: ({ alt }) => <span>{alt}</span>,
    li({ node, className, children }) {
      const line = node?.position?.start.line ?? null;
      return (
        <li className={className}>
          <LineContext.Provider value={line}>{children}</LineContext.Provider>
        </li>
      );
    },
    input({ type, checked }) {
      return type === "checkbox" ? <TaskBox fallback={!!checked} subtasks={subtasks} /> : null;
    },
  }), [subtasks]);
  return (
    <div className="gitask-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>{text}</ReactMarkdown>
    </div>
  );
}

function TaskBox({ fallback, subtasks }: { fallback: boolean; subtasks: SubtaskBinding }) {
  const line = React.useContext(LineContext);
  const st = line === null ? null : subtasks.find(line);
  if (!st || line === null) return <input type="checkbox" checked={fallback} disabled readOnly aria-label="sub-task" />;
  return (
    // Controlled: stays on the true state until the refreshed board arrives.
    <input type="checkbox" checked={st.checked} aria-label={st.text} data-key={`st${line}`} onChange={() => subtasks.toggle(line)} />
  );
}
