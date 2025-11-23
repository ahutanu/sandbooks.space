import { useEffect, useRef, useState } from 'react';
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import clsx from 'clsx';

interface BubbleMenuProps {
  editor: Editor;
}

export const BubbleMenu = ({ editor }: BubbleMenuProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !menuRef.current) return;

    const updatePosition = async () => {
      const { selection } = editor.state;
      const { from, to } = selection;

      if (from === to) {
        setIsVisible(false);
        return;
      }

      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);

      const referenceElement = {
        getBoundingClientRect: () => ({
          x: startCoords.left,
          y: startCoords.top,
          width: endCoords.right - startCoords.left,
          height: endCoords.bottom - startCoords.top,
          top: startCoords.top,
          left: startCoords.left,
          right: endCoords.right,
          bottom: endCoords.bottom,
          toJSON: () => ({}),
        }),
      };

      if (menuRef.current) {
        const { x, y } = await computePosition(referenceElement, menuRef.current, {
          placement: 'top',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        });

        if (menuRef.current) {
          menuRef.current.style.left = `${x}px`;
          menuRef.current.style.top = `${y}px`;
          setIsVisible(true);
        }
      }
    };

    const handleSelectionUpdate = () => {
      updatePosition();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    updatePosition();

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  if (!isVisible || editor.state.selection.empty || editor.state.selection.from === editor.state.selection.to) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-4 p-1 flex items-center gap-0.5 z-50 animate-fadeInSlideUp"
      role="toolbar"
      aria-label="Formatting menu"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={clsx(
          'p-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          editor.isActive('bold')
            ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
        )}
        aria-label="Bold"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={clsx(
          'p-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          editor.isActive('italic')
            ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
        )}
        aria-label="Italic"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="19" y1="4" x2="10" y2="4" strokeWidth={2} strokeLinecap="round" />
          <line x1="14" y1="20" x2="5" y2="20" strokeWidth={2} strokeLinecap="round" />
          <line x1="15" y1="4" x2="9" y2="20" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={clsx(
          'p-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          editor.isActive('underline')
            ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
        )}
        aria-label="Underline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14M5 5h14" />
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleLink().run()}
        className={clsx(
          'p-2 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          editor.isActive('link')
            ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700'
        )}
        aria-label="Link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  );
};
