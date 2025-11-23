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
    // Use a function that reads from options dynamically, not a closure
    const getExtension = () => this;
    const isEnabled = () => getExtension().options.enabled;

    return [
      new Plugin({
        key: FocusModePluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _decorationSet, oldState, newState) {
            // Only update decorations if focus mode is enabled
            // Read from options dynamically to get current value
            if (!isEnabled()) {
              return DecorationSet.empty;
            }

            // Check if selection changed or document changed
            const selectionChanged = !oldState.selection.eq(newState.selection);
            const docChanged = !oldState.doc.eq(newState.doc);
            const focusModeToggled = tr.getMeta('focusModeUpdate') === true;

            // Only recalculate if something relevant changed
            if (!selectionChanged && !docChanged && !focusModeToggled) {
              // Return existing decorations if nothing changed
              return _decorationSet.map(tr.mapping, tr.doc);
            }

            // Find the current active block (paragraph, heading, list item, etc.)
            const { $from } = newState.selection;
            
            // Find the top-level block that contains the cursor
            // We want to highlight the immediate child of the document
            let activeBlockStart = -1;
            
            // Walk up the node tree to find the top-level block (direct child of doc)
            for (let depth = $from.depth; depth >= 0; depth--) {
              const node = $from.node(depth);
              // Check if this is a block-level node and is a direct child of doc
              if (node.isBlock && depth === 1) {
                activeBlockStart = $from.start(depth);
                break;
              }
            }
            
            // Fallback: if no block found, use the document position
            if (activeBlockStart === -1) {
              activeBlockStart = 0;
            }

            const decorations: Decoration[] = [];

            // Traverse all top-level blocks (direct children of doc)
            newState.doc.forEach((node, offset) => {
              // Skip the document node itself
              if (node.type.name === 'doc') {
                return;
              }

              const blockStart = offset;
              const blockEnd = offset + node.nodeSize;

              // Check if this block contains the cursor
              // The active block is the one where the cursor position falls within its range
              const isActiveBlock = (
                activeBlockStart >= blockStart &&
                activeBlockStart < blockEnd
              );

              // Only dim non-active blocks
              if (!isActiveBlock && node.isBlock) {
                decorations.push(
                  Decoration.node(blockStart, blockEnd, {
                    class: 'focus-mode-dimmed',
                  })
                );
              }
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
