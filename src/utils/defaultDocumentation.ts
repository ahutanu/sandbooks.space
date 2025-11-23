/**
 * Sandbooks: Living Documentation
 *
 * Purpose: Comprehensive onboarding that teaches all features through action.
 * - Task-focused content
 * - Clear, concise writing
 * - Interactive examples
 * - Complete feature coverage
 */

import { nanoid } from 'nanoid';
import type { Note } from '../types';

export function createDefaultDocumentation(): Note[] {
  const now = Date.now();
  const getTimestamps = (offset: number = 0) => ({
    tag: now - offset,
    note: new Date(now - offset).toISOString(),
    code: now - offset,
  });

  const notes: Note[] = [];

  // NOTE 1: Welcome
  const t1 = getTimestamps(0);
  notes.push({
    id: nanoid(),
    title: 'Welcome',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Sandbooks' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Sandbooks stores your notes and code locally. Your data stays on your device.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Quick Start' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start typing to create content. Use the toolbar above for formatting. Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' for commands or ' }, { type: 'text', marks: [{ type: 'code' }], text: '?' }, { type: 'text', text: ' for shortcuts.' }],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type something in this note' }] }]
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '?' }, { type: 'text', text: ' to see keyboard shortcuts' }] }]
            },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'welcome', color: 'blue', createdAt: t1.tag, updatedAt: t1.tag },
    ],
    codeBlocks: [],
    createdAt: t1.note,
    updatedAt: t1.note,
  });

  // NOTE 2: Writing Basics
  const t2 = getTimestamps(1000);
  notes.push({
    id: nanoid(),
    title: 'Writing Basics',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Writing Basics' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Format text using the toolbar, keyboard shortcuts, or Markdown.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Text Formatting' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Bold' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+B' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: '**text**' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Italic' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+I' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: '*text*' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'strike' }], text: 'Strikethrough' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+S' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: '~~text~~' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'underline' }], text: 'Underline' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+U' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'highlight' }], text: 'Highlight' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+H' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Link: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+K' }, { type: 'text', text: ' or select text and click the link button' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Headings' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '# ' }, { type: 'text', text: ' for heading 1, ' }, { type: 'text', marks: [{ type: 'code' }], text: '## ' }, { type: 'text', text: ' for heading 2, ' }, { type: 'text', marks: [{ type: 'code' }], text: '### ' }, { type: 'text', text: ' for heading 3' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Or use ' }, { type: 'text', marks: [{ type: 'code' }], text: '/h1' }, { type: 'text', text: ', ' }, { type: 'text', marks: [{ type: 'code' }], text: '/h2' }, { type: 'text', text: ', ' }, { type: 'text', marks: [{ type: 'code' }], text: '/h3' }, { type: 'text', text: ' in the slash menu' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keyboard: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+1/2/3' }, { type: 'text', text: ' to convert current line' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Lists' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet list: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '- ' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+8' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Numbered list: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '1. ' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+7' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task list: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '[ ] ' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+9' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nest lists: Press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Tab' }, { type: 'text', text: ' to indent, ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Shift+Tab' }, { type: 'text', text: ' to outdent' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try formatting text with ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+B' }, { type: 'text', text: ' and ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+I' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Create a heading by typing ' }, { type: 'text', marks: [{ type: 'code' }], text: '# ' }, { type: 'text', text: ' at the start of a line' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start a list with ' }, { type: 'text', marks: [{ type: 'code' }], text: '- ' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: '1. ' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'guide', color: 'gray', createdAt: t2.tag, updatedAt: t2.tag },
    ],
    codeBlocks: [],
    createdAt: t2.note,
    updatedAt: t2.note,
  });

  // NOTE 3: Rich Formatting
  const t3 = getTimestamps(2000);
  notes.push({
    id: nanoid(),
    title: 'Rich Formatting',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Rich Formatting' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Control text appearance with colors, fonts, alignment, and advanced formatting.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Colors' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text color: Select text, click the color button, choose a color' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Highlight color: Select text, click the highlight button, choose a color' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keyboard: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+C' }, { type: 'text', text: ' for text color, ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+X' }, { type: 'text', text: ' for highlight' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Fonts' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Font family: Click the font button, choose JetBrains Mono, Inter, or System' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Font size: Click the font button, choose from 12px to 72px' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Default: JetBrains Mono at 14px' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Alignment' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Left: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+L' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Center: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+E' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+R' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Justify: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+J' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Advanced Text' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Superscript: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+.' }, { type: 'text', text: ' (useful for footnotes, exponents)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Subscript: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+,' }, { type: 'text', text: ' (useful for chemical formulas)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Blockquote: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '> ' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+B' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Code inline: Wrap text with backticks: ' }, { type: 'text', marks: [{ type: 'code' }], text: '`code`' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Select text and change its color' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try different font sizes' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Align a paragraph with ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+E' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'guide', color: 'gray', createdAt: t3.tag, updatedAt: t3.tag },
    ],
    codeBlocks: [],
    createdAt: t3.note,
    updatedAt: t3.note,
  });

  // NOTE 4: Media & Embeds
  const t4 = getTimestamps(3000);
  notes.push({
    id: nanoid(),
    title: 'Media & Embeds',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Media & Embeds' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Add images, videos, audio, files, and tables to your notes.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Images' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/image' }, { type: 'text', text: ' or click the image button in the toolbar' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Upload from your computer or paste a URL' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Drag and drop images directly into the editor' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Videos' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'YouTube: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/youtube' }, { type: 'text', text: ' and paste a YouTube URL' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Video files: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/video' }, { type: 'text', text: ' and upload or paste a URL' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Audio & Files' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Audio: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/audio' }, { type: 'text', text: ' and upload or paste a URL' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Files: Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/file' }, { type: 'text', text: ' to attach PDFs, documents, or other files' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Tables' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/table' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Shift+T' }, { type: 'text', text: ' to insert a table' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Click and drag borders to resize columns' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right-click table for options: add rows, delete columns, merge cells' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/table' }, { type: 'text', text: ' to insert a table' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try ' }, { type: 'text', marks: [{ type: 'code' }], text: '/image' }, { type: 'text', text: ' to add an image' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'guide', color: 'gray', createdAt: t4.tag, updatedAt: t4.tag },
    ],
    codeBlocks: [],
    createdAt: t4.note,
    updatedAt: t4.note,
  });

  // NOTE 5: Code & Terminal
  const t5 = getTimestamps(4000);
  notes.push({
    id: nanoid(),
    title: 'Code & Terminal',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Code & Terminal' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Run code in secure cloud sandboxes. Access a full Linux terminal.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Code Blocks' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/code' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+C' }, { type: 'text', text: ' to insert a code block' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Choose language: Python, JavaScript, TypeScript, Go, or Bash' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Click Run or press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Enter' }, { type: 'text', text: ' to execute' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Code runs in isolated sandboxes. Your local machine stays safe.' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Terminal' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+`' }, { type: 'text', text: ' to open the terminal' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full Linux shell with persistent working directory' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Install packages, run git commands, check system status' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Environment variables persist across sessions' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Run the code block below' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open terminal with ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+`' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'code', color: 'amber', createdAt: t5.tag, updatedAt: t5.tag },
    ],
    codeBlocks: [
      {
        id: nanoid(),
        code: 'print("Hello from Sandbooks!")\n\n# Calculate and display\nresult = 2 + 2\nprint(f"2 + 2 = {result}")',
        language: 'python',
        output: undefined,
        createdAt: t5.code,
        updatedAt: t5.code,
      },
    ],
    createdAt: t5.note,
    updatedAt: t5.note,
  });

  // NOTE 6: Organization
  const t6 = getTimestamps(5000);
  notes.push({
    id: nanoid(),
    title: 'Organization',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Organization' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Organize notes with tags, search, and navigation shortcuts.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Tags' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add tags at the bottom of any note' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Click the colored dot to change tag color across all notes' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tags help you group related notes' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Search' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+K' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+K' }, { type: 'text', text: ' to open search' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Search note titles, content, and tags' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' when not typing to search' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Navigation' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Toggle sidebar: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+\\' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+\\' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New note: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+N' }, { type: 'text', text: ' or ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl+Alt+N' }, { type: 'text', text: ', or press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'c' }, { type: 'text', text: ' when not typing' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sidebar shows all notes with tags and last edited time' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add a tag to this note' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+K' }, { type: 'text', text: ' to search' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'guide', color: 'gray', createdAt: t6.tag, updatedAt: t6.tag },
    ],
    codeBlocks: [],
    createdAt: t6.note,
    updatedAt: t6.note,
  });

  // NOTE 7: Focus & Productivity
  const t7 = getTimestamps(6000);
  notes.push({
    id: nanoid(),
    title: 'Focus & Productivity',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Focus & Productivity' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Use focus modes and shortcuts to work faster.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Focus Modes' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Typewriter Mode' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+T' }, { type: 'text', text: ' keeps cursor centered vertically' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Focus Mode' }, { type: 'text', text: ': ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+F' }, { type: 'text', text: ' dims everything except the active paragraph' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Dark Mode' }, { type: 'text', text: ': Click the moon icon in the top right' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Slash Commands' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' on a new line to see all commands' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Commands: headings, lists, code, table, image, YouTube, and more' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Filter by typing: ' }, { type: 'text', marks: [{ type: 'code' }], text: '/code' }, { type: 'text', text: ' shows code-related commands' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Keyboard Shortcuts' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '?' }, { type: 'text', text: ' to see all shortcuts' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Shortcuts work in the editor and globally' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Common: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+B' }, { type: 'text', text: ' bold, ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+K' }, { type: 'text', text: ' link, ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Enter' }, { type: 'text', text: ' run code' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try typewriter mode with ' }, { type: 'text', marks: [{ type: 'code' }], text: 'Cmd+Alt+T' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' to see slash commands' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'code' }], text: '?' }, { type: 'text', text: ' to view all shortcuts' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'guide', color: 'gray', createdAt: t7.tag, updatedAt: t7.tag },
    ],
    codeBlocks: [],
    createdAt: t7.note,
    updatedAt: t7.note,
  });

  // NOTE 8: Data & Export
  const t8 = getTimestamps(7000);
  notes.push({
    id: nanoid(),
    title: 'Data & Export',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Data & Export' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Your notes are stored locally. Export or sync with your file system anytime.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Local Storage' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notes save automatically as you type' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Data stays in your browser\'s Local Storage' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nothing leaves your device unless you export' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Export' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export current note: Download as Markdown (.md)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export all notes: Download as JSON' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use exported files in other Markdown editors' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Import' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Import Markdown files from other apps' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Drag and drop .md files into the app' }] }] },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'File System Sync' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Connect a folder to sync notes as Markdown files' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edit notes in VS Code or any Markdown editor' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use Git to version control your notes' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Check the export options in the sidebar' }] }] },
          ],
        },
      ],
    },
    tags: [
      { id: nanoid(), name: 'reference', color: 'purple', createdAt: t8.tag, updatedAt: t8.tag },
    ],
    codeBlocks: [],
    createdAt: t8.note,
    updatedAt: t8.note,
  });

  return notes;
}
