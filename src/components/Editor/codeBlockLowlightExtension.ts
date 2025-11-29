import { mergeAttributes } from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockLowlightComponent } from './CodeBlockLowlight';
import { lowlight } from './lowlight';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlockLowlight: {
      setCodeBlockLowlight: (attributes?: { language?: string | null }) => ReturnType;
      toggleCodeBlockLowlight: (attributes?: { language?: string | null }) => ReturnType;
    };
  }
}

export const CodeBlockLowlightExtension = CodeBlockLowlight.extend({
  name: 'codeBlockLowlight',

  addOptions() {
    return {
      lowlight,
      defaultLanguage: 'javascript',
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      enableTabIndentation: false,
      tabSize: 4,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (element: HTMLElement) => {
          const dataLanguage = element.getAttribute('data-language');

          if (dataLanguage) {
            return dataLanguage;
          }

          const { languageClassPrefix } = this.options;

          if (!languageClassPrefix) {
            return null;
          }

          const classNames = [...(element.firstElementChild?.classList || [])];
          const languages = classNames
            .filter((className) => className.startsWith(languageClassPrefix))
            .map((className) => className.replace(languageClassPrefix, ''));
          const language = languages[0];

          if (!language) {
            return null;
          }

          return language;
        },
        renderHTML: (attributes: { language?: string | null }) => ({
          'data-language': attributes.language || null,
        }),
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: Record<string, any> }) {
    return [
      'pre',
      mergeAttributes({
        'data-type': 'code-block-lowlight',
        class: 'code-block-lowlight',
      }, this.options.HTMLAttributes, HTMLAttributes),
      [
        'code',
        {
          class: node.attrs.language ? `${this.options.languageClassPrefix}${node.attrs.language}` : null,
        },
        0,
      ],
    ];
  },

  markdownTokenName: 'code',

  parseMarkdown: (token: any, helpers: any) => {
    if (token.raw?.startsWith('```') === false && token.codeBlockStyle !== 'indented') {
      return [];
    }

    return helpers.createNode(
      'codeBlockLowlight',
      { language: token.lang || null },
      token.text ? [helpers.createTextNode(token.text)] : [],
    );
  },

  renderMarkdown: (node: any, h: any) => {
    const language = node.attrs?.language || '';
    const content = node.content ? h.renderChildren(node.content) : '';
    const lines = [
      `\`\`\`${language}`,
      content,
      '```',
    ];

    return lines.join('\n');
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockLowlightComponent);
  },

  addCommands() {
    return {
      setCodeBlockLowlight:
        (attributes?: { language?: string | null }) =>
          ({ commands }: { commands: any }) =>
            commands.setNode(this.name, attributes),
      toggleCodeBlockLowlight:
        (attributes?: { language?: string | null }) =>
          ({ commands }: { commands: any }) =>
            commands.toggleNode(this.name, 'paragraph', attributes),
    };
  },
});
