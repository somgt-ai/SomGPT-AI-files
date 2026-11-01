import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`space-y-3 leading-relaxed text-[15px] ${className}`}>
      {renderMarkdownBlocks(content)}
    </div>
  );
};

function renderMarkdownBlocks(text: string): React.ReactNode[] {
  if (!text) return [];

  // Clean any raw internal action or thought JSON blocks from AI output
  let cleanedText = text
    .replace(/^\{\s*"action":[\s\S]*?\}\s*(\*\*\*|\-\-\-)?\s*/i, '')
    .replace(/^["\s,]*"thought":\s*"([\s\S]*?)"\s*\}?\s*/i, '$1\n\n')
    .replace(/^\{\s*"thought":\s*"([\s\S]*?)"\s*\}?\s*/i, '$1\n\n')
    .replace(/^\{[\s\S]*?"(answer|response|content)":\s*"([\s\S]*?)"\s*\}?\s*/i, '$2\n\n');
  if (!cleanedText.trim()) return [];

  // Split content by code blocks first
  const blocks: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-#+.]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(cleanedText)) !== null) {
    const textBefore = cleanedText.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      blocks.push(
        <div key={`text-${lastIndex}`} className="space-y-3">
          {renderRegularMarkdown(textBefore)}
        </div>
      );
    }

    const language = match[1]?.trim() || 'code';
    const code = match[2]?.replace(/\n$/, '') || '';
    blocks.push(
      <CodeBlock key={`code-${match.index}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = cleanedText.slice(lastIndex);
  if (remainingText.trim()) {
    blocks.push(
      <div key={`text-${lastIndex}`} className="space-y-3">
        {renderRegularMarkdown(remainingText)}
      </div>
    );
  }

  return blocks;
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({
  language,
  code,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#0d131f] shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#131c2d] border-b border-slate-800 text-xs text-slate-300 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-cyan-300">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13.5px] font-mono leading-relaxed text-slate-200 selection:bg-cyan-500/30">
        <pre className="m-0 p-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

function renderRegularMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (inList === 'ul') {
        nodes.push(
          <ul key={`ul-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-disc marker:text-cyan-400">
            {listItems}
          </ul>
        );
      } else {
        nodes.push(
          <ol key={`ol-${nodes.length}`} className="my-2 space-y-1.5 pl-5 list-decimal marker:text-cyan-400 marker:font-semibold">
            {listItems}
          </ol>
        );
      }
      inList = null;
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      nodes.push(
        <h3 key={`h3-${index}`} className="text-base font-bold text-cyan-300 dark:text-cyan-300 pt-2 pb-0.5">
          {formatInline(trimmed.replace('### ', ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      nodes.push(
        <h2 key={`h2-${index}`} className="text-lg font-bold text-slate-100 dark:text-white pt-3 pb-1 border-b border-slate-700/40">
          {formatInline(trimmed.replace('## ', ''))}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      nodes.push(
        <h1 key={`h1-${index}`} className="text-xl font-extrabold text-slate-100 dark:text-white pt-3 pb-1">
          {formatInline(trimmed.replace('# ', ''))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      nodes.push(
        <blockquote
          key={`quote-${index}`}
          className="my-2 pl-3.5 py-1.5 border-l-4 border-cyan-500 bg-cyan-950/20 text-slate-300 italic rounded-r-lg text-sm"
        >
          {formatInline(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      return;
    }

    // Unordered List (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
      }
      listItems.push(
        <li key={`li-${index}`} className="text-slate-200 dark:text-slate-200">
          {formatInline(trimmed.replace(/^[-*]\s+/, ''))}
        </li>
      );
      return;
    }

    // Ordered List (1. 2. etc)
    if (/^\d+\.\s+/.test(trimmed)) {
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
      }
      listItems.push(
        <li key={`li-${index}`} className="text-slate-200 dark:text-slate-200">
          {formatInline(trimmed.replace(/^\d+\.\s+/, ''))}
        </li>
      );
      return;
    }

    // Regular Paragraph
    flushList();
    nodes.push(
      <p key={`p-${index}`} className="text-slate-200 dark:text-slate-200 my-1.5 leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();
  return nodes;
}

// Formats inline markdown elements: **bold**, *italic*, `code`, and [links](url)
function formatInline(text: string): React.ReactNode {
  // Regex to match code, links, bold, italics
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let counter = 0;

  while (remaining.length > 0) {
    // Inline code `...`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={`code-${counter++}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md text-[13px] font-mono bg-slate-800 text-cyan-300 border border-slate-700/60"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Markdown Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a
          key={`link-${counter++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={`bold-${counter++}`} className="font-bold text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      parts.push(
        <em key={`italic-${counter++}`} className="italic text-slate-300">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Take normal character up to next special syntax
    const nextSpecialIndex = remaining.search(/[`*\[]/);
    if (nextSpecialIndex === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecialIndex > 0) {
      parts.push(remaining.slice(0, nextSpecialIndex));
      remaining = remaining.slice(nextSpecialIndex);
    } else {
      // Just take the single special character if it didn't match full pattern
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return <>{parts}</>;
}
