import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * TrailingNode Extension
 * 
 * Automatically adds an empty paragraph at the end of the document
 * to ensure the cursor can always continue writing after block elements.
 * This is a critical UX feature that prevents "stuck cursor" issues.
 */
export const TrailingNode = Extension.create({
  name: 'trailingNode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('trailingNode'),
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc } = newState;
          const lastChild = doc.lastChild;
          const lastChildIsBlock = lastChild && lastChild.isBlock;

          // If the last child is a block element (heading, paragraph, etc.)
          // and it's not empty, or if there's no last child, add a trailing paragraph
          if (!lastChild || (lastChildIsBlock && lastChild.content.size === 0)) {
            return null; // Already has empty trailing node
          }

          // Check if we need to add a trailing node
          const shouldAddTrailingNode = lastChildIsBlock && lastChild.content.size > 0;

          if (shouldAddTrailingNode) {
            const tr = newState.tr;
            const trailingNode = newState.schema.nodes.paragraph.create();
            tr.insert(doc.content.size, trailingNode);
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});

