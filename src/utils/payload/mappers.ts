/**
 * Payload Mappers
 *
 * Convert between runtime Note/JSONContent and compact PayloadNote/PayloadNode.
 * These mappers handle the transformation while stripping execution results
 * and other non-essential data.
 */

import type { JSONContent } from '@tiptap/react';
import { nanoid } from 'nanoid';
import type { Note } from '../../types';
import type { Tag, TagColor } from '../../types/tags.types';
import {
  type PayloadNote,
  type PayloadNode,
  type PayloadInline,
  NodeType,
  InlineType,
  LANGUAGE_TO_CODE,
  CODE_TO_LANGUAGE,
  COLOR_TO_CODE,
  CODE_TO_COLOR,
  LanguageCode,
  ColorCode,
} from '../../types/payload.types';

/**
 * Convert a runtime Note to a compact PayloadNote
 */
export function noteToPayload(note: Note, expiresAt?: number): PayloadNote {
  const content = note.content?.content || [];
  const nodes = content
    .map((node) => nodeToPayload(node))
    .filter((n): n is PayloadNode => n !== null);

  const payload: PayloadNote = {
    v: 1,
    c: Math.floor(new Date(note.createdAt).getTime() / 1000),
    u: Math.floor(new Date(note.updatedAt).getTime() / 1000),
    n: nodes,
  };

  // Only include title if not default
  if (note.title && note.title !== 'Untitled Note') {
    payload.t = note.title;
  }

  // Include tags if present
  if (note.tags && note.tags.length > 0) {
    payload.g = note.tags.map((tag) => [
      tag.name,
      COLOR_TO_CODE[tag.color] ?? ColorCode.Gray,
    ]);
  }

  // Include expiry if set
  if (expiresAt) {
    payload.x = expiresAt;
  }

  return payload;
}

/**
 * Convert a compact PayloadNote back to a runtime Note
 */
export function payloadToNote(payload: PayloadNote): Note {
  const now = new Date().toISOString();
  const content: JSONContent = {
    type: 'doc',
    content: payload.n.map((node) => payloadToNode(node)).filter(Boolean) as JSONContent[],
  };

  // Extract title from first heading if not provided
  let title = payload.t || 'Shared Note';
  if (!payload.t && payload.n.length > 0) {
    const firstNode = payload.n[0];
    if (Array.isArray(firstNode) && firstNode[0] === NodeType.Heading) {
      const inlines = firstNode[2] as PayloadInline[];
      title = extractTextFromInlines(inlines) || 'Shared Note';
    }
  }

  // Convert tags
  const tags: Tag[] | undefined =
    payload.g?.map(([name, colorCode]) => ({
      id: nanoid(),
      name,
      color: (CODE_TO_COLOR[colorCode as ColorCode] || 'gray') as TagColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) || undefined;

  return {
    id: nanoid(),
    title,
    content,
    createdAt: payload.c ? new Date(payload.c * 1000).toISOString() : now,
    updatedAt: payload.u ? new Date(payload.u * 1000).toISOString() : now,
    tags,
  };
}

/**
 * Convert a TipTap JSONContent node to a compact PayloadNode
 */
export function nodeToPayload(node: JSONContent): PayloadNode | null {
  if (!node || !node.type) {
    return null;
  }

  switch (node.type) {
    case 'paragraph': {
      const inlines = inlinesToPayload(node.content || []);
      return [NodeType.Paragraph, inlines];
    }

    case 'heading': {
      const level = node.attrs?.level || 1;
      const inlines = inlinesToPayload(node.content || []);
      return [NodeType.Heading, level, inlines];
    }

    case 'executableCodeBlock':
    case 'codeBlock': {
      const language = node.attrs?.language || 'javascript';
      const code = node.attrs?.code || node.content?.[0]?.text || '';
      const langCode = LANGUAGE_TO_CODE[language] ?? LanguageCode.JavaScript;
      // Note: executionResult, isExecuting, etc. are intentionally stripped
      return [NodeType.CodeBlock, langCode, code];
    }

    case 'bulletList': {
      const items = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.BulletList, items];
    }

    case 'orderedList': {
      const start = node.attrs?.start || 1;
      const items = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.OrderedList, start, items];
    }

    case 'listItem': {
      const content = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.ListItem, content];
    }

    case 'taskList': {
      const items = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.TaskList, items];
    }

    case 'taskItem': {
      const checked = node.attrs?.checked || false;
      const content = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.TaskItem, checked, content];
    }

    case 'blockquote': {
      const content = (node.content || [])
        .map((n) => nodeToPayload(n))
        .filter((n): n is PayloadNode => n !== null);
      return [NodeType.Blockquote, content];
    }

    case 'horizontalRule': {
      return [NodeType.HorizontalRule];
    }

    case 'hardBreak': {
      return [NodeType.HardBreak];
    }

    default: {
      // Skip unknown node types with warning
      console.warn(`[Payload] Skipping unknown node type: ${node.type}`);
      return null;
    }
  }
}

/**
 * Convert a compact PayloadNode back to TipTap JSONContent
 */
export function payloadToNode(node: PayloadNode): JSONContent | null {
  if (!Array.isArray(node)) {
    return null;
  }

  const nodeType = node[0] as NodeType;

  switch (nodeType) {
    case NodeType.Paragraph: {
      const inlines = node[1] as PayloadInline[];
      return {
        type: 'paragraph',
        content: payloadToInlines(inlines),
      };
    }

    case NodeType.Heading: {
      const level = node[1] as number;
      const inlines = node[2] as PayloadInline[];
      return {
        type: 'heading',
        attrs: { level },
        content: payloadToInlines(inlines),
      };
    }

    case NodeType.CodeBlock: {
      const langCode = node[1] as number;
      const code = node[2] as string;
      const language = CODE_TO_LANGUAGE[langCode as LanguageCode] || 'javascript';
      return {
        type: 'executableCodeBlock',
        attrs: {
          language,
          code,
          // No executionResult - user will run code themselves
        },
      };
    }

    case NodeType.BulletList: {
      const items = node[1] as PayloadNode[];
      return {
        type: 'bulletList',
        content: items.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.OrderedList: {
      const start = node[1] as number;
      const items = node[2] as PayloadNode[];
      return {
        type: 'orderedList',
        attrs: { start },
        content: items.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.ListItem: {
      const content = node[1] as PayloadNode[];
      return {
        type: 'listItem',
        content: content.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.TaskList: {
      const items = node[1] as PayloadNode[];
      return {
        type: 'taskList',
        content: items.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.TaskItem: {
      const checked = node[1] as boolean;
      const content = node[2] as PayloadNode[];
      return {
        type: 'taskItem',
        attrs: { checked },
        content: content.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.Blockquote: {
      const content = node[1] as PayloadNode[];
      return {
        type: 'blockquote',
        content: content.map((n) => payloadToNode(n)).filter(Boolean) as JSONContent[],
      };
    }

    case NodeType.HorizontalRule: {
      return { type: 'horizontalRule' };
    }

    case NodeType.HardBreak: {
      return { type: 'hardBreak' };
    }

    default: {
      console.warn(`[Payload] Skipping unknown payload node type: ${nodeType}`);
      return null;
    }
  }
}

/**
 * Convert TipTap inline content (text with marks) to compact PayloadInline[]
 */
export function inlinesToPayload(content: JSONContent[]): PayloadInline[] {
  const result: PayloadInline[] = [];

  for (const node of content) {
    if (!node) continue;

    if (node.type === 'text') {
      const text = node.text || '';
      if (!text) continue;

      // Check for marks
      const marks = node.marks || [];
      if (marks.length === 0) {
        // Plain text
        result.push(text);
      } else {
        // Apply marks (innermost first, then wrap)
        let current: PayloadInline = text;

        for (const mark of marks) {
          switch (mark.type) {
            case 'bold':
              current = [InlineType.Bold, [current]];
              break;
            case 'italic':
              current = [InlineType.Italic, [current]];
              break;
            case 'strike':
              current = [InlineType.Strike, [current]];
              break;
            case 'code':
              // Code mark wraps the text directly
              current = [InlineType.Code, text];
              break;
            case 'link':
              current = [InlineType.Link, mark.attrs?.href || '', [current]];
              break;
            case 'highlight':
              current = [InlineType.Highlight, [current]];
              break;
          }
        }

        result.push(current);
      }
    } else if (node.type === 'hardBreak') {
      // Handle inline hard breaks
      result.push([InlineType.Code, '\n']);
    }
  }

  return result;
}

/**
 * Convert compact PayloadInline[] back to TipTap JSONContent[]
 */
export function payloadToInlines(inlines: PayloadInline[]): JSONContent[] {
  const result: JSONContent[] = [];

  for (const inline of inlines) {
    if (typeof inline === 'string') {
      // Plain text
      result.push({ type: 'text', text: inline });
    } else if (Array.isArray(inline)) {
      const inlineType = inline[0] as InlineType;

      switch (inlineType) {
        case InlineType.Bold: {
          const content = inline[1] as PayloadInline[];
          const children = payloadToInlines(content);
          for (const child of children) {
            result.push({
              ...child,
              marks: [...(child.marks || []), { type: 'bold' }],
            });
          }
          break;
        }

        case InlineType.Italic: {
          const content = inline[1] as PayloadInline[];
          const children = payloadToInlines(content);
          for (const child of children) {
            result.push({
              ...child,
              marks: [...(child.marks || []), { type: 'italic' }],
            });
          }
          break;
        }

        case InlineType.Strike: {
          const content = inline[1] as PayloadInline[];
          const children = payloadToInlines(content);
          for (const child of children) {
            result.push({
              ...child,
              marks: [...(child.marks || []), { type: 'strike' }],
            });
          }
          break;
        }

        case InlineType.Code: {
          const text = inline[1] as string;
          result.push({
            type: 'text',
            text,
            marks: [{ type: 'code' }],
          });
          break;
        }

        case InlineType.Link: {
          const href = inline[1] as string;
          const content = inline[2] as PayloadInline[];
          const children = payloadToInlines(content);
          for (const child of children) {
            result.push({
              ...child,
              marks: [...(child.marks || []), { type: 'link', attrs: { href } }],
            });
          }
          break;
        }

        case InlineType.Highlight: {
          const content = inline[1] as PayloadInline[];
          const children = payloadToInlines(content);
          for (const child of children) {
            result.push({
              ...child,
              marks: [...(child.marks || []), { type: 'highlight' }],
            });
          }
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Extract plain text from PayloadInline[] (for title extraction)
 */
function extractTextFromInlines(inlines: PayloadInline[]): string {
  let text = '';

  for (const inline of inlines) {
    if (typeof inline === 'string') {
      text += inline;
    } else if (Array.isArray(inline)) {
      const inlineType = inline[0] as InlineType;
      if (inlineType === InlineType.Code) {
        text += inline[1] as string;
      } else {
        // For other mark types, recurse into content
        const content = inline[inlineType === InlineType.Link ? 2 : 1] as PayloadInline[];
        text += extractTextFromInlines(content);
      }
    }
  }

  return text;
}

/**
 * Count total nodes in a payload (for validation)
 */
export function countPayloadNodes(nodes: PayloadNode[]): number {
  let count = 0;

  for (const node of nodes) {
    count++;
    const nodeType = node[0] as NodeType;

    switch (nodeType) {
      case NodeType.BulletList:
      case NodeType.TaskList:
      case NodeType.Blockquote:
        count += countPayloadNodes(node[1] as PayloadNode[]);
        break;
      case NodeType.OrderedList:
        count += countPayloadNodes(node[2] as PayloadNode[]);
        break;
      case NodeType.ListItem:
        count += countPayloadNodes(node[1] as PayloadNode[]);
        break;
      case NodeType.TaskItem:
        count += countPayloadNodes(node[2] as PayloadNode[]);
        break;
    }
  }

  return count;
}

/**
 * Validate payload structure
 */
export function validatePayloadStructure(payload: unknown): payload is PayloadNote {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  // Check version
  if (p.v !== 1) {
    return false;
  }

  // Check required fields
  if (typeof p.c !== 'number' || typeof p.u !== 'number') {
    return false;
  }

  // Check nodes
  if (!Array.isArray(p.n)) {
    return false;
  }

  return true;
}
