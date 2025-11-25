import type { JSONContent } from '@tiptap/core';
import { generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

/**
 * Convert Tiptap JSONContent to Markdown using the Markdown extension
 */
export function serializeToMarkdown(content: JSONContent): string {
    if (!content || !content.content) return '';

    // Use direct JSON-to-markdown conversion
    try {
        // The Markdown extension in Tiptap v3 changes how content is serialized
        // We need to use a different approach - just serialize the JSON directly
        return jsonToMarkdown(content);
    } catch (error) {
        console.error('Error serializing to markdown:', error);
        return jsonToMarkdown(content);
    }
}

/**
 * Simple JSON to Markdown converter
 * This handles the most common node types
 */
function jsonToMarkdown(content: JSONContent): string {
    if (!content || !content.content) return '';

    return content.content.map(node => nodeToMarkdown(node)).join('\n\n');
}

function nodeToMarkdown(node: JSONContent): string {
    if (!node.type) return '';

    switch (node.type) {
        case 'heading': {
            const level = node.attrs?.level || 1;
            const headingText = node.content?.map(n => inlineToMarkdown(n)).join('') || '';
            return '#'.repeat(level) + ' ' + headingText;
        }

        case 'paragraph':
            return node.content?.map(n => inlineToMarkdown(n)).join('') || '';

        case 'bulletList':
            return node.content?.map(item => '- ' + nodeToMarkdown(item)).join('\n') || '';

        case 'orderedList':
            return node.content?.map((item, i) => `${i + 1}. ` + nodeToMarkdown(item)).join('\n') || '';

        case 'listItem':
            return node.content?.map(n => nodeToMarkdown(n)).join('') || '';

        case 'taskList':
            return node.content?.map(item => nodeToMarkdown(item)).join('\n') || '';

        case 'taskItem': {
            const checked = node.attrs?.checked ? 'x' : ' ';
            const taskText = node.content?.map(n => nodeToMarkdown(n)).join('') || '';
            return `- [${checked}] ${taskText}`;
        }

        case 'codeBlock': {
            const lang = node.attrs?.language || '';
            const code = node.content?.map(n => n.text || '').join('') || '';
            return `\`\`\`${lang}\n${code}\n\`\`\``;
        }

        case 'executableCodeBlock': {
            const lang = node.attrs?.language || '';
            const code = node.attrs?.code || '';
            return `\`\`\`${lang}\n${code}\n\`\`\``;
        }

        case 'blockquote': {
            const quoteLines = node.content?.map(n => nodeToMarkdown(n)).join('\n') || '';
            return quoteLines.split('\n').map(line => '> ' + line).join('\n');
        }

        case 'horizontalRule':
            return '---';

        case 'hardBreak':
            return '  \n';

        default:
            return node.content?.map(n => nodeToMarkdown(n)).join('') || '';
    }
}

function inlineToMarkdown(node: JSONContent): string {
    if (node.type === 'text') {
        let text = node.text || '';

        // Apply marks
        if (node.marks) {
            for (const mark of node.marks) {
                switch (mark.type) {
                    case 'bold':
                        text = `**${text}**`;
                        break;
                    case 'italic':
                        text = `*${text}*`;
                        break;
                    case 'strike':
                        text = `~~${text}~~`;
                        break;
                    case 'code':
                        text = `\`${text}\``;
                        break;
                    case 'link':
                        text = `[${text}](${mark.attrs?.href || ''})`;
                        break;
                    case 'highlight':
                        text = `==${text}==`;
                        break;
                }
            }
        }

        return text;
    } else if (node.type === 'hardBreak') {
        return '  \n';
    } else if (node.type === 'image') {
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        return `![${alt}](${src})`;
    }

    return '';
}

/**
 * Parse Markdown to Tiptap JSONContent
 */
export function parseMarkdown(markdown: string): JSONContent {
    if (!markdown) {
        return {
            type: 'doc',
            content: [],
        };
    }

    // For tests and environments where DOMParser isn't available,
    // fall back to simple text paragraph
    if (typeof window === 'undefined' || !window.DOMParser) {
        return {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: markdown }],
                },
            ],
        };
    }

    const extensions = [StarterKit, Markdown];

    try {
        // Tiptap's generateJSON with Markdown extension should handle markdown directly
        return generateJSON(markdown, extensions);
    } catch (error) {
        console.error('Error parsing markdown:', error);
        // Fallback to simple paragraph
        return {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [{ type: 'text', text: markdown }],
                },
            ],
        };
    }
}
