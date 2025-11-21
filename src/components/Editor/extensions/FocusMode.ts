import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface FocusModeOptions {
  enabled: boolean;
}

export const FocusModePluginKey = new PluginKey('focusMode');

/**
 * Focus Mode Extension for TipTap
 *
 * Dims all paragraphs/blocks except the one containing the cursor,
 * helping users concentrate on the current sentence/paragraph.
 *
 * Based on research showing this feature helps maintain flow state
 * and reduces distraction (iA Writer, FocusWriter pattern).
 */
export const FocusMode = Extension.create<FocusModeOptions>({
  name: 'focusMode',

  addOptions() {
    return {
      enabled: false,
    };
  },

  addProseMirrorPlugins() {
    const isEnabled = () => this.options.enabled;

    return [
      new Plugin({
        key: FocusModePluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decorationSet, oldState, newState) {
            // Only update decorations if focus mode is enabled
            if (!isEnabled()) {
              return DecorationSet.empty;
            }

            // Only update if selection changed or document changed
            const selectionChanged = !oldState.selection.eq(newState.selection);
            const docChanged = !oldState.doc.eq(newState.doc);

            if (!selectionChanged && !docChanged) {
              return decorationSet.map(tr.mapping, tr.doc);
            }

            // Find the current active block (paragraph, heading, etc.)
            const { $from } = newState.selection;
            const currentBlockPos = $from.before($from.depth);

            // Get the current block node
            const currentBlockNode = $from.node($from.depth);
            const currentBlockEnd = currentBlockPos + currentBlockNode.nodeSize;

            const decorations: Decoration[] = [];

            // Traverse all top-level blocks
            newState.doc.descendants((node, pos, parent) => {
              // Only process top-level blocks (direct children of doc)
              if (parent !== newState.doc) {
                return true; // Continue traversal into children
              }

              // Skip the current active block
              const blockStart = pos;
              const blockEnd = pos + node.nodeSize;

              // Check if this is the active block
              const isActiveBlock = (
                blockStart <= currentBlockPos &&
                blockEnd >= currentBlockEnd
              );

              if (isActiveBlock) {
                return false; // Skip this block, don't dim it
              }

              // Apply dimming decoration to non-active blocks
              // Use inline decorations for all node types
              if (node.isBlock && node.type.name !== 'doc') {
                decorations.push(
                  Decoration.node(blockStart, blockEnd, {
                    class: 'focus-mode-dimmed',
                  })
                );
              }

              return false; // Don't traverse into children
            });

            return DecorationSet.create(newState.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
