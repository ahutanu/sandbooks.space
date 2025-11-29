import { Extension } from '@tiptap/core';

/**
 * Smart Writing Behaviors Extension
 *
 * Provides intelligent writing behaviors matching Word/Notion/journaling apps:
 * - Smart list handling (Enter, Backspace, Tab/Shift+Tab)
 * - Soft line breaks (Shift+Enter)
 * - Text manipulation (delete line, duplicate line)
 * - Block transformations (Cmd+Alt+1/2/3/0)
 * - Intelligent indentation
 */
export const SmartWritingBehaviors = Extension.create({
  name: 'smartWritingBehaviors',

  addKeyboardShortcuts() {
    return {
      // Enter key - creates line break (minimal spacing) in paragraphs
      Enter: () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're in a heading - convert to paragraph on Enter
        if ($from.parent.type.name === 'heading') {
          // Insert a new paragraph after the heading
          return this.editor.commands.insertContentAt($from.after(), {
            type: 'paragraph',
          });
        }

        // Check if we're inside a code block (traverse up the tree)
        let depth = $from.depth;
        while (depth > 0) {
          const node = $from.node(depth);
          if (
            node.type.name === 'codeBlock' ||
            node.type.name === 'codeBlockLowlight' ||
            node.type.name === 'executableCodeBlock'
          ) {
            return false; // Use default behavior in code blocks
          }
          depth--;
        }

        // Check if we're inside a list item (traverse up the tree)
        // In TipTap, structure is: bulletList > listItem > paragraph > text
        // So we need to check ancestors, not just immediate parent
        let listItemNode = null;
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
            listItemNode = node;
            break;
          }
          listItemDepth--;
        }

        // If we're in a list item, use default behavior (create new list item)
        if (listItemNode) {
          // Check if the list item is empty - exit list
          if (listItemNode.textContent.length === 0) {
            const itemType = listItemNode.type.name;
            return this.editor.commands.liftListItem(itemType);
          }
          // Non-empty list item: use default (create new item)
          return false;
        }

        // In normal paragraphs, create line break instead of new paragraph
        return this.editor.commands.setHardBreak();
      },

      // Shift+Enter - creates new paragraph (with 24px spacing)
      'Shift-Enter': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // In lists, create line break within item
        if ($from.parent.type.name === 'listItem' || $from.parent.type.name === 'taskItem') {
          return this.editor.commands.setHardBreak();
        }

        // In normal paragraphs, create new paragraph (default behavior)
        return false;
      },

      // Smart list handling - Tab to indent (nest) list items
      Tab: () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're inside a list item (traverse up the tree)
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem') {
            return this.editor.commands.sinkListItem('listItem');
          }
          if (node.type.name === 'taskItem') {
            return this.editor.commands.sinkListItem('taskItem');
          }
          listItemDepth--;
        }

        // If not in a list, allow default tab behavior (browser will handle)
        return false;
      },

      // Smart list handling - Shift+Tab to outdent (unnest) list items
      'Shift-Tab': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're inside a list item (traverse up the tree)
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem') {
            return this.editor.commands.liftListItem('listItem');
          }
          if (node.type.name === 'taskItem') {
            return this.editor.commands.liftListItem('taskItem');
          }
          listItemDepth--;
        }

        return false;
      },


      // Smart Backspace in lists - convert to paragraph at start of list item
      Backspace: () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're inside a list item (traverse up the tree)
        let listItemNode = null;
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
            listItemNode = node;
            break;
          }
          listItemDepth--;
        }

        // If we're at the start of a list item, convert to paragraph (exit list)
        if (listItemNode && $from.parentOffset === 0) {
          const itemType = listItemNode.type.name;
          return this.editor.commands.liftListItem(itemType);
        }

        return false;
      },

      // Delete current line (Cmd+Shift+K)
      'Mod-Shift-k': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Get the start and end of the current line
        const start = $from.start();
        const end = $from.end();

        // Delete the entire line
        this.editor.commands.deleteRange({ from: start, to: end });

        return true;
      },

      // Duplicate current line (Cmd+Shift+D)
      'Mod-Shift-d': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Get the current node content
        const nodeContent = $from.parent.textContent;

        // Insert a new paragraph with the same content after the current one
        const pos = $from.after();
        this.editor
          .chain()
          .insertContentAt(pos, {
            type: 'paragraph',
            content: nodeContent ? [{ type: 'text', text: nodeContent }] : [],
          })
          .focus()
          .run();

        return true;
      },

      // Convert to H1 (Cmd+Alt+1)
      'Mod-Alt-1': () => {
        return this.editor.commands.setHeading({ level: 1 });
      },

      // Convert to H2 (Cmd+Alt+2)
      'Mod-Alt-2': () => {
        return this.editor.commands.setHeading({ level: 2 });
      },

      // Convert to H3 (Cmd+Alt+3)
      'Mod-Alt-3': () => {
        return this.editor.commands.setHeading({ level: 3 });
      },

      // Convert to paragraph (Cmd+Alt+0)
      'Mod-Alt-0': () => {
        return this.editor.commands.setParagraph();
      },

      // Select all editor content only (Cmd+A / Ctrl+A)
      // Prevents browser default which selects entire page
      'Mod-a': () => {
        return this.editor.commands.selectAll();
      },

      // Increase indent (Cmd+])
      'Mod-]': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're inside a list item (traverse up the tree)
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem') {
            return this.editor.commands.sinkListItem('listItem');
          }
          if (node.type.name === 'taskItem') {
            return this.editor.commands.sinkListItem('taskItem');
          }
          listItemDepth--;
        }

        // For other blocks, could implement custom indent logic
        return false;
      },

      // Decrease indent (Cmd+[)
      'Mod-[': () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're inside a list item (traverse up the tree)
        let listItemDepth = $from.depth;
        while (listItemDepth > 0) {
          const node = $from.node(listItemDepth);
          if (node.type.name === 'listItem') {
            return this.editor.commands.liftListItem('listItem');
          }
          if (node.type.name === 'taskItem') {
            return this.editor.commands.liftListItem('taskItem');
          }
          listItemDepth--;
        }

        // For other blocks, could implement custom outdent logic
        return false;
      },
    };
  },

  // Add custom paste handler for smart paste
  addProseMirrorPlugins() {
    return [
      // Could add custom paste handling here if needed
      // For now, TipTap's built-in paste handling is quite good
    ];
  },
});
