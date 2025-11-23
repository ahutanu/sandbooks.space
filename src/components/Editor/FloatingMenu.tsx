import { useEffect, useRef, useState } from 'react';
import { computePosition, offset, flip, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';

interface FloatingMenuProps {
  editor: Editor;
}

export const FloatingMenu = ({ editor }: FloatingMenuProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !menuRef.current) return;

    const updateVisibility = () => {
      const { selection } = editor.state;
      const { from } = selection;
      const isEmpty = editor.isEmpty;
      const isAtStart = from === 0;

      setIsVisible(isEmpty || isAtStart);
    };

    const updatePosition = async () => {
      if (!isVisible || !menuRef.current) return;

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

      if (menuRef.current) {
        const { x, y } = await computePosition(referenceElement, menuRef.current, {
          placement: 'top-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        });

        if (menuRef.current) {
          menuRef.current.style.left = `${x}px`;
          menuRef.current.style.top = `${y}px`;
        }
      }
    };

    updateVisibility();
    updatePosition();

    const handleUpdate = () => {
      updateVisibility();
      updatePosition();
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-elevation-4 p-1 flex items-center gap-0.5 z-50 animate-fadeInSlideUp"
      role="toolbar"
      aria-label="Insert menu"
    >
      <button
        onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}
        className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors duration-150"
        aria-label="Heading 1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <text x="4" y="18" fontSize="14" fontWeight="bold" fill="currentColor">H1</text>
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}
        className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors duration-150"
        aria-label="Heading 2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <text x="4" y="18" fontSize="14" fontWeight="bold" fill="currentColor">H2</text>
        </svg>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors duration-150"
        aria-label="Bullet List"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
          <line x1="8" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
          <line x1="8" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
};
