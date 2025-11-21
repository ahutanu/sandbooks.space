import { Extension } from '@tiptap/core';
import { textblockTypeInputRule, wrappingInputRule } from '@tiptap/core';

/**
 * Custom Markdown Input Rules Extension
 *
 * Adds Word-like auto-formatting for:
 * - ## + space → Heading 2
 * - ### + space → Heading 3
 * - > + space → Blockquote
 *
 * Note: Bullet lists (-), ordered lists (1.), task lists ([]), and horizontal rules (---)
 * are already handled by TipTap's StarterKit extensions.
 */
export const MarkdownInputRules = Extension.create({
  name: 'markdownInputRules',

  addInputRules() {
    return [
      // Heading 2: ## + space
      textblockTypeInputRule({
        find: /^##\s$/,
        type: this.editor.schema.nodes.heading,
        getAttributes: () => ({ level: 2 }),
      }),

      // Heading 3: ### + space
      textblockTypeInputRule({
        find: /^###\s$/,
        type: this.editor.schema.nodes.heading,
        getAttributes: () => ({ level: 3 }),
      }),

      // Blockquote: > + space
      wrappingInputRule({
        find: /^>\s$/,
        type: this.editor.schema.nodes.blockquote,
      }),
    ];
  },
});
