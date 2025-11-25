import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ExecutableCodeBlockComponent } from './ExecutableCodeBlock';
import type { Language } from '../../types';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    executableCodeBlock: {
      setExecutableCodeBlock: (attrs?: { code?: string; language?: Language }) => ReturnType;
    };
  }
}

export const ExecutableCodeBlock = Node.create({
  name: 'executableCodeBlock',

  group: 'block',

  code: true,

  defining: true,

  // Make this an atom - CodeMirror manages content internally
  // This prevents TipTap from interfering with CodeMirror's state
  atom: true,

  // Make draggable - users can reorder code blocks
  // NOTE: atom and draggable CAN coexist - atom nodes can still be dragged!
  draggable: true,

  // No text content - code stored in attribute
  // Prevent formatting marks (bold, italic, etc.) in code blocks
  marks: '',

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => {
          // Extract code from text content or data-code attribute
          return element.getAttribute('data-code') || element.textContent || '';
        },
        renderHTML: (attributes) => {
          return {
            'data-code': attributes.code,
          };
        },
      },
      language: {
        default: 'python',
        parseHTML: (element) => element.getAttribute('data-language'),
        renderHTML: (attributes) => ({
          'data-language': attributes.language,
        }),
      },
      executionResult: {
        default: undefined,
        parseHTML: (element) => {
          const data = element.getAttribute('data-execution-result');
          return data ? JSON.parse(data) : undefined;
        },
        renderHTML: (attributes) => ({
          'data-execution-result': attributes.executionResult
            ? JSON.stringify(attributes.executionResult)
            : null,
        }),
      },
      isExecuting: {
        default: false,
      },
      executionCount: {
        default: undefined,
        parseHTML: (element) => {
          const count = element.getAttribute('data-execution-count');
          return count ? parseInt(count, 10) : undefined;
        },
        renderHTML: (attributes) => ({
          'data-execution-count': attributes.executionCount || null,
        }),
      },
      jupyterOutputs: {
        default: undefined,
        parseHTML: (element) => {
          const data = element.getAttribute('data-jupyter-outputs');
          return data ? JSON.parse(data) : undefined;
        },
        renderHTML: (attributes) => ({
          'data-jupyter-outputs': attributes.jupyterOutputs
            ? JSON.stringify(attributes.jupyterOutputs)
            : null,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="executable-code-block"]',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'executable-code-block' }),
      // No nested pre/code - CodeMirror handles rendering
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExecutableCodeBlockComponent);
  },

  addCommands() {
    return {
      setExecutableCodeBlock:
        (attrs?: { code?: string; language?: Language }) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              code: attrs?.code || '',
              language: attrs?.language || 'python',
              executionResult: undefined,
              isExecuting: false,
            },
          }),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () =>
        this.editor.chain().focus().setExecutableCodeBlock().run(),
    };
  },
});
