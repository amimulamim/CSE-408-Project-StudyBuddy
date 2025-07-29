import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  textSize?: string; // Optional text size class (e.g., "text-lg", "text-2xl")
  font?: string;     // Optional font class (e.g., "font-bold", "font-medium")
}

// Custom components for markdown rendering
const CustomLink: React.FC<any> = ({ node, children, ...props }) => (
  <a
    {...props}
    className="text-blue-600 hover:underline dark:text-blue-400 break-words"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

const CustomCode: React.FC<any> = ({ className, children, ...props }) => {
  const isInline = !className?.includes('language-');
  if (isInline) {
    return (
      <code 
        className="bg-muted px-1 py-0.5 rounded text-sm break-words" 
        style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
      >
        {children}
      </code>
    );
  }
  // This is a code block
  return (
    <code className="bg-muted px-1 py-0.5 rounded text-sm">
      {children}
    </code>
  );
};

const CustomPre: React.FC<any> = ({ children, ...props }) => (
  <pre 
    className="bg-muted p-3 rounded-lg overflow-x-auto text-sm whitespace-pre max-w-full scrollbar-hide border"
    {...props}
  >
    {children}
  </pre>
);

const CustomParagraph: React.FC<any> = ({ children, ...props }) => (
  <p className="break-words" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }} {...props}>
    {children}
  </p>
);

const CustomTable: React.FC<any> = ({ children, ...props }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full" {...props}>
      {children}
    </table>
  </div>
);

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  textSize = 'text-sm', 
  font = '' 
}) => {
  return (
    <div 
      className={`prose prose-neutral dark:prose-invert max-w-none ${textSize} ${font}`}
      style={{ 
        overflowWrap: 'anywhere', 
        wordBreak: 'break-word',
        minWidth: 0
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: CustomLink,
          code: CustomCode,
          pre: CustomPre,
          p: CustomParagraph,
          table: CustomTable,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
