import { describe, it, expect } from 'vitest';
import { extractTitleFromContent } from './titleExtraction';
import type { JSONContent } from '@tiptap/core';

describe('extractTitleFromContent', () => {
  describe('empty or invalid content', () => {
    it('returns "Untitled Note" for empty content', () => {
      const content: JSONContent = { type: 'doc', content: [] };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });

    it('returns "Untitled Note" for null content', () => {
      const content: JSONContent = { type: 'doc' };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });

    it('returns "Untitled Note" for content without content array', () => {
      const content: JSONContent = { type: 'doc', content: undefined };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });
  });

  describe('paragraph nodes', () => {
    it('extracts text from simple paragraph', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello World' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Hello World');
    });

    it('extracts text from paragraph with multiple text nodes', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              { type: 'text', text: 'World' },
            ],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Hello World');
    });

    it('returns "Untitled Note" for empty paragraph', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });

    it('trims whitespace from paragraph text', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '  Hello World  ' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Hello World');
    });
  });

  describe('heading nodes', () => {
    it('extracts text from heading', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Main Title' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Main Title');
    });

    it('handles different heading levels', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Subtitle' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Subtitle');
    });
  });

  describe('code block nodes', () => {
    it('extracts first line from executableCodeBlock', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'executableCodeBlock',
            content: [
              { type: 'text', text: 'function hello() {\n  return "world";\n}' },
            ],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('function hello() {');
    });

    it('extracts first line from codeBlock', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1;\nconst y = 2;' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('const x = 1;');
    });

    it('handles single-line code block', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'console.log("test")' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('console.log("test")');
    });
  });

  describe('task list nodes', () => {
    it('extracts text from first task item', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'First task' }],
                  },
                ],
              },
              {
                type: 'taskItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Second task' }],
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('First task');
    });

    it('returns "Untitled Note" for empty task list', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [{ type: 'taskList', content: [] }],
      };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });
  });

  describe('blockquote nodes', () => {
    it('extracts text from blockquote', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Quoted text' }],
              },
            ],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Quoted text');
    });
  });

  describe('image nodes', () => {
    it('returns "[Image]" for image nodes', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'image.jpg' },
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('[Image]');
    });
  });

  describe('truncation', () => {
    it('truncates long text to default 100 characters', () => {
      const longText = 'a'.repeat(150);
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: longText }],
          },
        ],
      };
      const result = extractTitleFromContent(content);
      expect(result).toBe('a'.repeat(100) + '...');
      expect(result.length).toBe(103); // 100 + '...'
    });

    it('respects custom maxLength parameter', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello World This Is A Long Text' }],
          },
        ],
      };
      const result = extractTitleFromContent(content, 10);
      expect(result).toBe('Hello Worl...');
    });

    it('does not truncate text shorter than maxLength', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Short' }],
          },
        ],
      };
      expect(extractTitleFromContent(content, 100)).toBe('Short');
    });

    it('trims before checking truncation', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '  Short  ' }],
          },
        ],
      };
      expect(extractTitleFromContent(content, 10)).toBe('Short');
    });
  });

  describe('nested content', () => {
    it('extracts text from deeply nested nodes', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Nested ' },
                  { type: 'text', text: 'text' },
                ],
              },
            ],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Nested text');
    });
  });

  describe('unknown node types', () => {
    it('handles unknown node types gracefully', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'unknownNode',
            content: [{ type: 'text', text: 'Some text' }],
          },
        ],
      };
      expect(extractTitleFromContent(content)).toBe('Some text');
    });

    it('returns "Untitled Note" for unknown node without text', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [{ type: 'unknownNode' }],
      };
      expect(extractTitleFromContent(content)).toBe('Untitled Note');
    });
  });
});
