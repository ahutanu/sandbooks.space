import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import type { Instance as TippyInstance } from 'tippy.js';
import { SlashMenuList } from '../SlashMenuList';
import type { SlashMenuListHandle } from '../SlashMenuList';

export interface SlashCommandItem {
  title: string;
  description: string;
  searchTerms: string[];
  icon: string;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

type SlashSuggestionProps = SuggestionProps<SlashCommandItem> & {
  event: KeyboardEvent;
  clientRect?: (() => DOMRect | null) | null;
};

export const slashCommandItems: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    searchTerms: ['h1', 'heading1', 'title'],
    icon: 'H1',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    searchTerms: ['h2', 'heading2', 'subtitle'],
    icon: 'H2',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    searchTerms: ['h3', 'heading3', 'subheading'],
    icon: 'H3',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    searchTerms: ['bullet', 'ul', 'unordered', 'list'],
    icon: 'BulletList',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    searchTerms: ['number', 'ol', 'ordered', 'list', '1', '2', '3'],
    icon: 'NumberedList',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: 'Task List',
    description: 'Create a checklist',
    searchTerms: ['todo', 'task', 'check', 'checkbox', 'list'],
    icon: 'TaskList',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleTaskList()
        .run();
    },
  },
  {
    title: 'Code Block',
    description: 'Execute code in multiple languages',
    searchTerms: ['code', 'exec', 'run', 'execute'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock()
        .run();
    },
  },
  {
    title: 'Python Code',
    description: 'Execute Python code with Jupyter kernel',
    searchTerms: ['python', 'py', 'code'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock({ language: 'python' })
        .run();
    },
  },
  {
    title: 'JavaScript Code',
    description: 'Execute JavaScript code',
    searchTerms: ['javascript', 'js', 'code', 'node'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock({ language: 'javascript' })
        .run();
    },
  },
  {
    title: 'TypeScript Code',
    description: 'Execute TypeScript code',
    searchTerms: ['typescript', 'ts', 'code'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock({ language: 'typescript' })
        .run();
    },
  },
  {
    title: 'Bash Script',
    description: 'Execute Bash script',
    searchTerms: ['bash', 'sh', 'shell', 'script', 'terminal'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock({ language: 'bash' })
        .run();
    },
  },
  {
    title: 'Go Code',
    description: 'Execute Go code',
    searchTerms: ['go', 'golang', 'code'],
    icon: 'Code',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setExecutableCodeBlock({ language: 'go' })
        .run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    searchTerms: ['quote', 'blockquote', 'citation'],
    icon: 'Quote',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide blocks',
    searchTerms: ['hr', 'divider', 'line', 'separator', 'horizontal'],
    icon: 'Divider',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    searchTerms: ['table', 'grid', 'rows', 'columns'],
    icon: 'Table',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: 'YouTube',
    description: 'Embed a YouTube video',
    searchTerms: ['youtube', 'video', 'embed', 'yt'],
    icon: 'YouTube',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'youtube',
          attrs: { src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        })
        .run();
    },
  },
  {
    title: 'Image',
    description: 'Insert an image',
    searchTerms: ['image', 'img', 'picture', 'photo'],
    icon: 'Image',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: '' })
        .run();
    },
  },
];

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashSuggestionProps }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) => {
            const searchStr = query.toLowerCase().trim();

            // Exact match on title
            if (item.title.toLowerCase().includes(searchStr)) {
              return true;
            }

            // Fuzzy match on search terms
            return item.searchTerms.some((term) =>
              term.toLowerCase().includes(searchStr)
            );
          });
        },
        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props: SlashSuggestionProps) => {
              component = new ReactRenderer(SlashMenuList, {
                props,
                editor: props.editor,
              });

              const getReferenceClientRect = props.clientRect
                ? () => props.clientRect!() ?? new DOMRect()
                : () => new DOMRect();

              popup = tippy(document.body, {
                getReferenceClientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                maxWidth: 'none',
                offset: [0, 8],
              });
            },

            onUpdate(props: SlashSuggestionProps) {
              component.updateProps(props);

              const getReferenceClientRect = props.clientRect
                ? () => props.clientRect!() ?? new DOMRect()
                : () => new DOMRect();
              popup?.setProps({ getReferenceClientRect });
            },

            onKeyDown(props: SlashSuggestionProps) {
              if (props.event.key === 'Escape') {
                popup?.hide();
                return true;
              }

            return (component.ref as SlashMenuListHandle | null)?.onKeyDown(props) ?? false;
            },

            onExit() {
              popup?.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
