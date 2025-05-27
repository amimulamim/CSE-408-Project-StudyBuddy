import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          code: ({ className, children, ...props }) => {
            return (
              <code className="bg-muted px-1 py-0.5 rounded text-sm">
                {children}
              </code>
            );
          },
        }}
      />
    </div>
  );
};

export default MarkdownRenderer;
