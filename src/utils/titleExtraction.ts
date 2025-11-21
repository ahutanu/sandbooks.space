import type { JSONContent } from '@tiptap/core';

/**
 * Extract plain text title from TipTap JSON content
 * @param content - TipTap JSON content object
 * @param maxLength - Maximum characters before truncation (default: 100)
 * @returns Extracted title string or "Untitled Note"
 */
export function extractTitleFromContent(
  content: JSONContent,
  maxLength: number = 100
): string {
  // Handle empty or invalid content
  if (!content?.content || content.content.length === 0) {
    return 'Untitled Note';
  }

  const firstNode = content.content[0];

  // Handle different node types
  let text = '';

  switch (firstNode.type) {
    case 'paragraph':
    case 'heading':
      text = extractTextFromNode(firstNode);
      break;

    case 'executableCodeBlock':
    case 'codeBlock':
      // Use first line of code as title
      text = extractTextFromNode(firstNode).split('\n')[0];
      break;

    case 'taskList': {
      // Extract first task item text
      const firstTask = firstNode.content?.[0];
      text = firstTask ? extractTextFromNode(firstTask) : '';
      break;
    }

    case 'blockquote':
      // Extract quote content
      text = extractTextFromNode(firstNode);
      break;

    case 'image':
      return '[Image]';

    default:
      text = extractTextFromNode(firstNode);
  }

  // Clean and truncate
  text = text.trim();

  if (text === '') {
    return 'Untitled Note';
  }

  if (text.length > maxLength) {
    return text.slice(0, maxLength).trim() + '...';
  }

  return text;
}

/**
 * Recursively extract plain text from a node
 */
function extractTextFromNode(node: JSONContent): string {
  if (!node) return '';

  // Text node
  if (node.type === 'text') {
    return node.text || '';
  }

  // Node with children
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child) => extractTextFromNode(child))
      .join('');
  }

  return '';
}
