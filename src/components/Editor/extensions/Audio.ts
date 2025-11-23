import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (attrs: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const Audio = Node.create({
  name: 'audio',

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
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'audio[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { controls: true })];
  },

  addCommands() {
    return {
      setAudio:
        (attrs: { src: string; title?: string }) =>
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

