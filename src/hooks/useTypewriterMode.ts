import { useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Custom hook for iA Writer-style typewriter mode
 * Keeps the cursor centered vertically while typing
 *
 * @param editor - TipTap editor instance
 * @param enabled - Whether typewriter mode is active
 */
export const useTypewriterMode = (editor: Editor | null, enabled: boolean) => {
  const scrollToCursor = useCallback(() => {
    if (!editor || !enabled) return;

    // Get the current selection/cursor position
    const { state } = editor;
    const { selection } = state;
    const { $anchor } = selection;

    // Find the DOM node at the cursor position
    const pos = editor.view.domAtPos($anchor.pos);
    const node = pos.node;

    // Get the closest element (might be text node, need parent element)
    const element = node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : node as HTMLElement;

    if (!element) return;

    // Get the editor's scrollable container
    const editorContainer = editor.view.dom.closest('.overflow-y-auto');
    if (!editorContainer) return;

    // Calculate positions
    const containerRect = editorContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Calculate the center of the viewport
    const viewportCenter = containerRect.height / 2;

    // Calculate how much we need to scroll to center the cursor
    const elementCenter = elementRect.top - containerRect.top + elementRect.height / 2;
    const scrollOffset = elementCenter - viewportCenter;

    // Only scroll if we're far enough from center (prevents jitter)
    const threshold = 50; // pixels
    if (Math.abs(scrollOffset) > threshold) {
      const currentScroll = editorContainer.scrollTop;
      const targetScroll = currentScroll + scrollOffset;

      // Smooth scroll to center
      editorContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [editor, enabled]);

  useEffect(() => {
    if (!editor || !enabled) return;

    // Track if we're typing (not navigating with arrow keys)
    let isTyping = false;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger on navigation keys
      const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
      if (navigationKeys.includes(event.key)) {
        isTyping = false;
        return;
      }

      // User is typing
      isTyping = true;

      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Reset typing state after 500ms of no typing
      typingTimeout = setTimeout(() => {
        isTyping = false;
      }, 500);
    };

    const handleUpdate = () => {
      // Only scroll if user is actively typing
      if (isTyping) {
        scrollToCursor();
      }
    };

    // Listen for keyboard events on the editor
    const editorDom = editor.view.dom;
    editorDom.addEventListener('keydown', handleKeyDown);

    // Listen for editor updates (content changes)
    editor.on('update', handleUpdate);

    // Also scroll on selection changes while typing
    editor.on('selectionUpdate', () => {
      if (isTyping) {
        scrollToCursor();
      }
    });

    return () => {
      editorDom.removeEventListener('keydown', handleKeyDown);
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate');
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [editor, enabled, scrollToCursor]);

  // Initial scroll when mode is first enabled
  useEffect(() => {
    if (enabled && editor) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToCursor();
      }, 100);
    }
  }, [enabled, editor, scrollToCursor]);
};
