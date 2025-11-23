
export interface Shortcut {
    id: string;
    keys: string[];
    action: string;
    rawKey?: string;
    category: string;
}

export const SHORTCUTS: Shortcut[] = [
    // Notes & Navigation
    { id: 'NEW_NOTE_GMAIL', keys: ['c'], action: 'Create new note (when not typing)', category: 'Notes & Navigation' },
    { id: 'NEW_NOTE_GLOBAL', keys: ['mod', 'alt', 'n'], action: 'Create new note (Global)', category: 'Notes & Navigation' },
    { id: 'SEARCH_GMAIL', keys: ['/'], action: 'Search notes (when not typing)', category: 'Notes & Navigation' },
    { id: 'SEARCH_GLOBAL', keys: ['mod', 'k'], action: 'Search notes (Cmd+K / Ctrl+K)', category: 'Notes & Navigation' },
    { id: 'TOGGLE_SIDEBAR', keys: ['mod', '\\'], action: 'Toggle sidebar (Cmd+\\ / Ctrl+\\)', category: 'Notes & Navigation' },
    { id: 'TOGGLE_TERMINAL', keys: ['ctrl', '`'], action: 'Toggle terminal (Ctrl+`)', category: 'Notes & Navigation' },
    { id: 'TOGGLE_TYPEWRITER', keys: ['mod', 'alt', 't'], action: 'Toggle typewriter mode', category: 'Notes & Navigation' },
    { id: 'TOGGLE_FOCUS', keys: ['mod', 'alt', 'f'], action: 'Toggle focus mode', category: 'Notes & Navigation' },

    // Text Formatting
    { id: 'BOLD', keys: ['mod', 'b'], action: 'Bold (in editor)', category: 'Text Formatting' },
    { id: 'ITALIC', keys: ['mod', 'i'], action: 'Italic', category: 'Text Formatting' },
    { id: 'UNDERLINE', keys: ['mod', 'u'], action: 'Underline', category: 'Text Formatting' },
    { id: 'STRIKETHROUGH', keys: ['mod', 'shift', 's'], action: 'Strikethrough', category: 'Text Formatting' },
    { id: 'HIGHLIGHT', keys: ['mod', 'shift', 'h'], action: 'Highlight', category: 'Text Formatting' },
    { id: 'INSERT_LINK', keys: ['mod', 'k'], action: 'Insert link (in editor)', category: 'Text Formatting' },
    { id: 'TEXT_COLOR', keys: ['mod', 'shift', 'c'], action: 'Text color', category: 'Text Formatting' },
    { id: 'HIGHLIGHT_COLOR', keys: ['mod', 'shift', 'x'], action: 'Highlight color', category: 'Text Formatting' },
    { id: 'SUPERSCRIPT', keys: ['mod', '.'], action: 'Superscript', category: 'Text Formatting' },
    { id: 'SUBSCRIPT', keys: ['mod', ','], action: 'Subscript', category: 'Text Formatting' },

    // Block Formatting
    { id: 'BLOCKQUOTE', keys: ['mod', 'shift', 'b'], action: 'Blockquote', category: 'Block Formatting' },
    { id: 'BULLET_LIST', keys: ['mod', 'shift', '8'], action: 'Bullet list', category: 'Block Formatting' },
    { id: 'NUMBERED_LIST', keys: ['mod', 'shift', '7'], action: 'Numbered list', category: 'Block Formatting' },
    { id: 'TASK_LIST', keys: ['mod', 'shift', '9'], action: 'Task list', category: 'Block Formatting' },
    { id: 'INSERT_CODE_BLOCK', keys: ['mod', 'alt', 'c'], action: 'Insert code block', category: 'Block Formatting' },
    { id: 'INSERT_TABLE', keys: ['mod', 'shift', 't'], action: 'Insert table', category: 'Block Formatting' },
    { id: 'ALIGN_LEFT', keys: ['mod', 'shift', 'l'], action: 'Align left', category: 'Block Formatting' },
    { id: 'ALIGN_CENTER', keys: ['mod', 'shift', 'e'], action: 'Align center', category: 'Block Formatting' },
    { id: 'ALIGN_RIGHT', keys: ['mod', 'shift', 'r'], action: 'Align right', category: 'Block Formatting' },
    { id: 'ALIGN_JUSTIFY', keys: ['mod', 'shift', 'j'], action: 'Justify', category: 'Block Formatting' },

    // Block Transformations
    { id: 'HEADING_1', keys: ['mod', 'alt', '1'], action: 'Convert to Heading 1', category: 'Block Transformations' },
    { id: 'HEADING_2', keys: ['mod', 'alt', '2'], action: 'Convert to Heading 2', category: 'Block Transformations' },
    { id: 'HEADING_3', keys: ['mod', 'alt', '3'], action: 'Convert to Heading 3', category: 'Block Transformations' },
    { id: 'PARAGRAPH', keys: ['mod', 'alt', '0'], action: 'Convert to paragraph', category: 'Block Transformations' },

    // Smart Writing
    { id: 'NEW_PARAGRAPH', keys: ['shift', 'enter'], action: 'New paragraph (24px spacing)', category: 'Smart Writing' },
    { id: 'LINE_BREAK', keys: ['enter'], action: 'Line break (minimal spacing)', category: 'Smart Writing' },
    { id: 'DELETE_LINE', keys: ['mod', 'shift', 'k'], action: 'Delete current line', category: 'Smart Writing' },
    { id: 'DUPLICATE_LINE', keys: ['mod', 'shift', 'd'], action: 'Duplicate current line', category: 'Smart Writing' },
    { id: 'INCREASE_INDENT', keys: ['mod', ']'], action: 'Increase indent', category: 'Smart Writing' },
    { id: 'DECREASE_INDENT', keys: ['mod', '['], action: 'Decrease indent', category: 'Smart Writing' },

    // Slash Commands
    { id: 'SLASH_MENU', rawKey: '/', keys: [], action: 'Open command menu', category: 'Slash Commands' },
    { id: 'SLASH_HEADING', rawKey: '/h1 /h2 /h3', keys: [], action: 'Insert heading', category: 'Slash Commands' },
    { id: 'SLASH_LIST', rawKey: '/bullet /number', keys: [], action: 'Insert list', category: 'Slash Commands' },
    { id: 'SLASH_TODO', rawKey: '/todo', keys: [], action: 'Insert task list', category: 'Slash Commands' },
    { id: 'SLASH_CODE', rawKey: '/code', keys: [], action: 'Insert code block', category: 'Slash Commands' },
    { id: 'SLASH_QUOTE', rawKey: '/quote', keys: [], action: 'Insert blockquote', category: 'Slash Commands' },
    { id: 'SLASH_DIVIDER', rawKey: '/hr', keys: [], action: 'Insert divider', category: 'Slash Commands' },

    // Markdown Shortcuts
    { id: 'MD_BULLET', rawKey: '- Space', keys: [], action: 'Start bullet list', category: 'Markdown Shortcuts' },
    { id: 'MD_NUMBER', rawKey: '1. Space', keys: [], action: 'Start numbered list', category: 'Markdown Shortcuts' },
    { id: 'MD_TASK', rawKey: '[ ] Space', keys: [], action: 'Start task list', category: 'Markdown Shortcuts' },
    { id: 'MD_QUOTE', rawKey: '> Space', keys: [], action: 'Start blockquote', category: 'Markdown Shortcuts' },
    { id: 'MD_HEADING', rawKey: '# Space', keys: [], action: 'Create heading (# to ######)', category: 'Markdown Shortcuts' },
    { id: 'MD_HR', rawKey: '---', keys: [], action: 'Insert horizontal rule', category: 'Markdown Shortcuts' },

    // List Navigation
    { id: 'INDENT_LIST', keys: ['tab'], action: 'Indent (nest) list item', category: 'List Navigation' },
    { id: 'OUTDENT_LIST', keys: ['shift', 'tab'], action: 'Outdent (unnest) list item', category: 'List Navigation' },
    { id: 'CONTINUE_LIST', keys: ['enter'], action: 'Continue list / Exit on empty item', category: 'List Navigation' },
    { id: 'EXIT_LIST', keys: ['backspace'], action: 'Convert to paragraph at start of list', category: 'List Navigation' },

    // Code Execution
    { id: 'RUN_CODE', keys: ['mod', 'enter'], action: 'Run code block (when focused)', category: 'Code Execution' },
    { id: 'CLEAR_OUTPUT', keys: ['mod', 'shift', 'c'], action: 'Clear code output', category: 'Code Execution' },

    // General
    { id: 'SHOW_SHORTCUTS', rawKey: '?', keys: [], action: 'Show/hide keyboard shortcuts (when not typing)', category: 'General' },
    { id: 'CLOSE_MODAL', keys: ['escape'], action: 'Close dialog/modal', category: 'General' },
];

export const getShortcutById = (id: string): Shortcut | undefined => {
    return SHORTCUTS.find(s => s.id === id);
};

export const getShortcutsByCategory = (): Record<string, Shortcut[]> => {
    return SHORTCUTS.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);
};
