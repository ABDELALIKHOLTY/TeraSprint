import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const isInline = !match && !String(children).includes('\n');
          
          if (!isInline && language === 'mermaid') {
            return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
          }

          return !isInline ? (
            <SyntaxHighlighter
              {...rest}
              children={String(children).replace(/\n$/, '')}
              style={vscDarkPlus as any}
              language={language || 'text'}
              PreTag="div"
              wrapLongLines={true}
              className="rounded-md my-4 text-sm max-h-[400px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent"
            />
          ) : (
            <code {...rest} className={`${className || ''} bg-gray-200 dark:bg-gray-800 rounded px-1.5 py-0.5 text-red-600 dark:text-red-400 font-mono text-sm break-words`}>
              {children}
            </code>
          );
        },
        table(props) {
          return (
            <div className="overflow-x-auto overflow-y-auto max-h-[400px] my-4 border border-gray-200 dark:border-[#3f3f46] rounded-md shadow-sm scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3f3f46]" {...props} />
            </div>
          );
        },
        thead(props) {
          return <thead className="bg-gray-50 dark:bg-[#27272a]" {...props} />;
        },
        tbody(props) {
          return <tbody className="bg-white dark:bg-[#1a1a1f] divide-y divide-gray-200 dark:divide-[#3f3f46]" {...props} />;
        },
        tr(props) {
          return <tr className="hover:bg-gray-50 dark:hover:bg-[#2a2a2e] transition-colors" {...props} />;
        },
        th(props) {
          return <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />;
        },
        td(props) {
          return <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100" {...props} />;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then((result) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = result.svg;
        }
      }).catch((e) => {
        console.error('Mermaid render error', e);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-500 bg-red-100 dark:bg-red-900/30 rounded">Error rendering diagram: ${e.message}</div>`;
        }
      });
    }
  }, [chart]);

  return <div ref={containerRef} className="my-4 flex justify-center bg-white dark:bg-[#121214] p-4 rounded-md shadow-sm border border-gray-200 dark:border-[#3f3f46]" />;
};
