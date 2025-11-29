import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { showToast as toast } from '../../utils/toast';

export const CodeBlockLowlightComponent = ({ node }: NodeViewProps) => {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string | null) || 'code';

  const handleCopy = useCallback(async () => {
    const codeText = node.textContent || '';

    if (!codeText) {
      toast.error('Nothing to copy');
      return;
    }

    if (!navigator.clipboard) {
      toast.error('Clipboard not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      toast.success('Code copied');
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to copy code';
      toast.error(message);
    }
  }, [node.textContent]);

  return (
    <NodeViewWrapper className="code-block-lowlight-wrapper my-6 max-w-4xl mx-auto" data-type="code-block-lowlight">
      <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-code-block transition-colors duration-200 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white/70 px-4 py-2 text-xs uppercase tracking-wide text-stone-500 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300">
          <span className="font-semibold">{language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              'rounded-lg px-3 py-1 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              copied
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600',
            )}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="m-0 max-h-[60vh] overflow-auto bg-transparent px-4 py-4 text-sm leading-relaxed text-stone-900 dark:text-stone-50">
          <code className="block whitespace-pre font-mono text-sm leading-relaxed prose-code">
            <NodeViewContent className="block whitespace-pre font-mono" spellCheck={false} />
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  );
};
