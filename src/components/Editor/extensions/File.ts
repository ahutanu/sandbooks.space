import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    file: {
      setFile: (attrs: { src: string; filename?: string; size?: string; type?: string }) => ReturnType;
    };
  }
}

export const File = Node.create({
  name: 'file',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      filename: {
        default: null,
      },
      size: {
        default: null,
      },
      type: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'file' })];
  },

  addCommands() {
    return {
      setFile:
        (attrs: { src: string; filename?: string; size?: string; type?: string }) =>
        ({ editor }: CommandProps) =>
          editor
            .chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run(),
    };
  },
});

