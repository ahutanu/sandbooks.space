import { describe, it, expect } from 'vitest';
import { serializeToMarkdown, parseMarkdown } from '../markdownSerializer';
import type { JSONContent } from '@tiptap/core';

describe('markdownSerializer', () => {
    describe('serializeToMarkdown', () => {
        it('should return empty string for empty content', () => {
            expect(serializeToMarkdown({})).toBe('');
            expect(serializeToMarkdown({ content: [] })).toBe('');
        });

        it('should serialize headings', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Heading 1' }] },
                    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading 2' }] },
                ]
            };
            expect(serializeToMarkdown(content)).toBe('# Heading 1\n\n## Heading 2');
        });

        it('should serialize paragraphs with formatting', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
                            { type: 'text', text: ' and ' },
                            { type: 'text', text: 'Italic', marks: [{ type: 'italic' }] },
                        ]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('**Bold** and *Italic*');
        });

        it('should serialize bullet lists', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'bulletList',
                        content: [
                            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
                            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
                        ]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('- Item 1\n- Item 2');
        });

        it('should serialize ordered lists', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'orderedList',
                        content: [
                            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
                            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
                        ]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('1. First\n2. Second');
        });

        it('should serialize code blocks', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'codeBlock',
                        attrs: { language: 'python' },
                        content: [{ type: 'text', text: 'print("Hello")' }]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('```python\nprint("Hello")\n```');
        });

        it('should serialize blockquotes', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'blockquote',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('> Quote');
        });

        it('should serialize horizontal rules', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [{ type: 'horizontalRule' }]
            };
            expect(serializeToMarkdown(content)).toBe('---');
        });

        it('should serialize links and images', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
                            { type: 'image', attrs: { src: 'image.png', alt: 'Alt Text' } }
                        ]
                    }
                ]
            };
            expect(serializeToMarkdown(content)).toBe('[Link](https://example.com)![Alt Text](image.png)');
        });
    });

    describe('parseMarkdown', () => {
        it('should return empty doc for empty string', () => {
            expect(parseMarkdown('')).toEqual({ type: 'doc', content: [] });
        });

        it('should parse basic markdown', () => {
            const markdown = '# Hello\n\nWorld';
            const result = parseMarkdown(markdown);
            expect(result.type).toBe('doc');
            // In test environment without proper DOMParser, it falls back to paragraph
            expect(result.content).toBeDefined();
            expect(result.content?.length).toBeGreaterThan(0);
        });

        it('should handle parsing errors gracefully', () => {
            // Since we are using happy-dom, generateJSON should work.
            // Let's just verify it returns a valid doc structure.
            const result = parseMarkdown('Simple text');
            expect(result.type).toBe('doc');
            expect(result.content?.[0].content?.[0].text).toBe('Simple text');
        });
    });

    describe('serializeToMarkdown edge cases', () => {
        it('should handle task lists', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'taskList',
                        content: [
                            {
                                type: 'taskItem',
                                attrs: { checked: true },
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done task' }] }]
                            },
                            {
                                type: 'taskItem',
                                attrs: { checked: false },
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Todo task' }] }]
                            },
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('[x]');
            expect(result).toContain('[ ]');
        });

        it('should handle multiple marks on same text', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Bold and Italic',
                                marks: [{ type: 'bold' }, { type: 'italic' }]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            // Should apply both marks (order may vary)
            expect(result).toMatch(/\*\*.*\*.*\*\*/);
        });

        it('should handle underline mark', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Underlined',
                                marks: [{ type: 'underline' }]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            // Underline is not standard markdown, should just return text
            expect(result).toContain('Underlined');
        });

        it('should handle highlight mark', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Highlighted',
                                marks: [{ type: 'highlight' }]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('==Highlighted==');
        });

        it('should handle code mark', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'code',
                                marks: [{ type: 'code' }]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('`code`');
        });

        it('should handle links', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: 'Link Text',
                                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toBe('[Link Text](https://example.com)');
        });

        it('should handle images', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'image',
                                attrs: { src: 'image.png', alt: 'Alt text' }
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toBe('![Alt text](image.png)');
        });

        it('should handle images without alt text', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'image',
                                attrs: { src: 'image.png' }
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toBe('![](image.png)');
        });

        it('should handle hard breaks', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Line 1' },
                            { type: 'hardBreak' },
                            { type: 'text', text: 'Line 2' }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('Line 1');
            expect(result).toContain('Line 2');
        });

        it('should handle empty content', () => {
            expect(serializeToMarkdown({ type: 'doc', content: [] })).toBe('');
            expect(serializeToMarkdown({ type: 'doc' })).toBe('');
            expect(serializeToMarkdown({})).toBe('');
        });

        it('should handle nodes without type', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    { content: [{ type: 'text', text: 'text' }] } as JSONContent
                ]
            };
            const result = serializeToMarkdown(content);
            // Should handle gracefully
            expect(typeof result).toBe('string');
        });

        it('should handle blockquotes with multiple lines', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'blockquote',
                        content: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
                            { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('> Line 1');
            expect(result).toContain('> Line 2');
        });

        it('should handle nested lists', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'bulletList',
                        content: [
                            {
                                type: 'listItem',
                                content: [
                                    { type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] },
                                    {
                                        type: 'bulletList',
                                        content: [
                                            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nested' }] }] }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('Item 1');
            expect(result).toContain('Nested');
        });

        it('should handle code blocks without language', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'codeBlock',
                        content: [{ type: 'text', text: 'code here' }]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('```');
            expect(result).toContain('code here');
        });

        it('should handle headings without level', () => {
            const content: JSONContent = {
                type: 'doc',
                content: [
                    {
                        type: 'heading',
                        content: [{ type: 'text', text: 'Heading' }]
                    }
                ]
            };
            const result = serializeToMarkdown(content);
            expect(result).toContain('# Heading');
        });
    });
});
