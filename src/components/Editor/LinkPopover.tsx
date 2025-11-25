import { useState, useEffect, useRef } from 'react';
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';

interface LinkPopoverProps {
  editor: Editor;
  onClose: () => void;
  initialUrl?: string;
}

export const LinkPopover = ({ editor, onClose, initialUrl = '' }: LinkPopoverProps) => {
  const [url, setUrl] = useState(initialUrl);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!popoverRef.current || !editor) return;

    const updatePosition = async () => {
      const { selection } = editor.state;
      const { from } = selection;
      const coords = editor.view.coordsAtPos(from);
      const referenceElement = {
        getBoundingClientRect: () => ({
          x: coords.left,
          y: coords.top,
          width: 0,
          height: 0,
          top: coords.top,
          left: coords.left,
          right: coords.left,
          bottom: coords.top,
          toJSON: () => ({}),
        }),
      };

      if (popoverRef.current) {
        const { x, y } = await computePosition(referenceElement, popoverRef.current, {
          placement: 'top',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        });

        if (popoverRef.current) {
          popoverRef.current.style.left = `${x}px`;
          popoverRef.current.style.top = `${y}px`;
        }
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 100);
    return () => clearInterval(interval);
  }, [editor]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!editor) return;

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onClose();
      return;
    }

    const finalUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    } else {
      editor.chain().focus().insertContent({
        type: 'text',
        marks: [{ type: 'link', attrs: { href: finalUrl } }],
        text: url,
      }).run();
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-2 p-3 max-w-[320px] z-50 animate-fadeInSlideUp"
      role="dialog"
      aria-label="Insert or edit link"
    >
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://example.com"
        className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-50 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
        aria-label="Link URL"
      />
      <div className="flex gap-3 justify-end mt-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/50 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Cancel link insertion"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Insert link"
        >
          Insert
        </button>
      </div>
    </div>
  );
};


