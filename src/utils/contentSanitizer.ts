/**
 * Content Sanitizer for TipTap/ProseMirror
 *
 * ProseMirror does not allow empty text nodes (text nodes with empty string).
 * This utility removes them from JSONContent before loading into TipTap.
 */

import type { JSONContent } from '@tiptap/react';

/**
 * Recursively sanitize TipTap JSONContent by removing empty text nodes
 * and cleaning up empty content arrays.
 *
 * @param content - The JSONContent to sanitize
 * @returns Sanitized JSONContent safe for TipTap
 */
export function sanitizeContent(content: JSONContent): JSONContent {
  if (!content) {
    return content;
  }

  // Clone the content to avoid mutations
  const result = { ...content };

  // If this is a text node, check if it's empty
  if (result.type === 'text') {
    // Empty text nodes are not allowed in ProseMirror
    // Return a placeholder that will be filtered out
    if (!result.text || result.text === '') {
      return { type: '__empty__' };
    }
    return result;
  }

  // Recursively sanitize content array
  if (result.content && Array.isArray(result.content)) {
    result.content = result.content
      .map((node: JSONContent) => sanitizeContent(node))
      .filter((node: JSONContent) => {
        // Filter out empty text nodes
        if (node.type === '__empty__') {
          return false;
        }
        // Filter out nodes with empty content arrays (except leaf nodes)
        if (node.content && Array.isArray(node.content) && node.content.length === 0) {
          // Some nodes like paragraph, heading can be empty and that's valid
          const allowEmptyContent = ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem'];
          return allowEmptyContent.includes(node.type || '');
        }
        return true;
      });
  }

  return result;
}

/**
 * Check if content contains empty text nodes that would cause ProseMirror errors
 *
 * @param content - The JSONContent to check
 * @returns true if content needs sanitization
 */
export function needsSanitization(content: JSONContent): boolean {
  if (!content) {
    return false;
  }

  // Check if this is an empty text node
  if (content.type === 'text' && (!content.text || content.text === '')) {
    return true;
  }

  // Recursively check content array
  if (content.content && Array.isArray(content.content)) {
    return content.content.some((node: JSONContent) => needsSanitization(node));
  }

  return false;
}

/**
 * Sanitize a Note's content field
 * Returns a new note object with sanitized content (does not mutate original)
 *
 * @param note - The note to sanitize
 * @returns Note with sanitized content
 */
export function sanitizeNoteContent<T extends { content: JSONContent }>(note: T): T {
  if (!note.content) {
    return note;
  }

  const sanitizedContent = sanitizeContent(note.content);

  // Only return new object if content actually changed
  if (sanitizedContent === note.content) {
    return note;
  }

  return {
    ...note,
    content: sanitizedContent,
  };
}

/**
 * Batch sanitize multiple notes
 *
 * @param notes - Array of notes to sanitize
 * @returns Array of notes with sanitized content
 */
export function sanitizeNotes<T extends { content: JSONContent }>(notes: T[]): T[] {
  return notes.map((note) => sanitizeNoteContent(note));
}
