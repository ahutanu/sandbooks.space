/**
 * Sandbooks: Living Documentation (action-led)
 *
 * Purpose: be the best possible onboarding + self-documenting tour.
 * - Short, scannable copy
 * - Task lists that encourage real interactions
 * - Runnable/code samples across languages
 */

import type { Note } from '../types';

export function createDefaultDocumentation(): Note[] {
  const now = Date.now();
  const getTimestamps = (offset: number = 0) => ({
    tag: now - offset,
    note: new Date(now - offset).toISOString(),
    code: now - offset,
  });

  const notes: Note[] = [];

  // NOTE 1: Run Code Immediately
  const t1 = getTimestamps(0);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Start Here: Run Code in Seconds',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Start Here: Run Code in Seconds' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Sandbooks is a living notebook for developers—write, run, and stay in flow without leaving the page.' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Runs usually finish in under a second. If a sandbox is waking up, expect a brief spin. Offline? Editing still works—toggle cloud back on to run.' }],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Turn on cloud execution (☁ in the header) until the slash disappears.' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Press ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: '▶ Run' },
                    { type: 'text', text: ' or ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: '⌘Enter / Ctrl+Enter' },
                    { type: 'text', text: ' on the block below.' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Try more runtimes → "Five Languages, One Canvas"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t1.tag, updatedAt: t1.tag },
      { id: crypto.randomUUID(), name: 'start-here', color: 'emerald', createdAt: t1.tag, updatedAt: t1.tag },
    ],
    codeBlocks: [
      {
        id: crypto.randomUUID(),
        code: '# Feel the round-trip\nimport time\nstart = time.time()\nprint("Hello from Sandbooks")\nprint(f"Finished in {time.time() - start:.3f}s")',
        language: 'python',
        output: undefined,
        createdAt: t1.code,
        updatedAt: t1.code,
      },
    ],
    createdAt: t1.note,
    updatedAt: t1.note,
  });

  // NOTE 2: Languages
  const t2 = getTimestamps(1000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Five Languages, One Canvas',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Five Languages, One Canvas' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Pick the right runtime without leaving your note. Every block is isolated; switching languages is instant.' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Python' }, { type: 'text', text: ': quick data checks.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'JavaScript' }, { type: 'text', text: ': APIs and transforms.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'TypeScript' }, { type: 'text', text: ': type-safe snippets.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Bash' }, { type: 'text', text: ': text + file ops.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Go' }, { type: 'text', text: ': quick concurrency checks.' }] }] },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Change the dropdown on any block to swap languages—state stays intact.' }],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Run at least two different languages to feel the isolation.' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Switch a block to a new language using the selector.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Find anything → "Search Faster Than You Think"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t2.tag, updatedAt: t2.tag },
      { id: crypto.randomUUID(), name: 'code', color: 'amber', createdAt: t2.tag, updatedAt: t2.tag },
    ],
    codeBlocks: [
      {
        id: crypto.randomUUID(),
        code: '# Python: small data pulse\nscores = [85, 92, 78, 95, 88, 91]\nprint(f"Mean: {sum(scores)/len(scores):.1f}")\nprint(f"Max: {max(scores)}")',
        language: 'python',
        output: undefined,
        createdAt: t2.code,
        updatedAt: t2.code,
      },
      {
        id: crypto.randomUUID(),
        code: '// JavaScript: quick transform\nconst people = [{name: "Ada", lang: "Go"}, {name: "Lin", lang: "TypeScript"}];\nconsole.log(people.map(p => p.name).join(" & "));\nconsole.log(`Unique langs: ${new Set(people.map(p => p.lang)).size}`);',
        language: 'javascript',
        output: undefined,
        createdAt: t2.code,
        updatedAt: t2.code,
      },
      {
        id: crypto.randomUUID(),
        code: '// TypeScript: stay typed\ninterface Task { id: number; text: string; done: boolean }\nconst tasks: Task[] = [\n  { id: 1, text: "Ship onboarding", done: true },\n  { id: 2, text: "Invite teammates", done: false },\n];\nconsole.log(`Todo: ${tasks.filter(t => !t.done).length}`);',
        language: 'typescript',
        output: undefined,
        createdAt: t2.code,
        updatedAt: t2.code,
      },
      {
        id: crypto.randomUUID(),
        code: '# Bash: text + files\nprintf "api\\nnotes\\nterminal\\n" > /tmp/sandbooks.txt\ngrep -n "notes" /tmp/sandbooks.txt\nwc -l /tmp/sandbooks.txt',
        language: 'bash',
        output: undefined,
        createdAt: t2.code,
        updatedAt: t2.code,
      },
      {
        id: crypto.randomUUID(),
        code: '// Go: tiny timer\npackage main\nimport (\n  "fmt"\n  "time"\n)\nfunc main() {\n  start := time.Now()\n  time.Sleep(120 * time.Millisecond)\n  fmt.Printf("Slept for %v\\n", time.Since(start))\n}\n',
        language: 'go',
        output: undefined,
        createdAt: t2.code,
        updatedAt: t2.code,
      },
    ],
    createdAt: t2.note,
    updatedAt: t2.note,
  });

  // NOTE 3: Search
  const t3 = getTimestamps(2000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Search Faster Than You Think',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Search Faster Than You Think' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Titles, full content, code, and tags are indexed. Results appear as you type.' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '⌘F / Ctrl+F' }, { type: 'text', text: ': open search anywhere.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '/' }, { type: 'text', text: ': instant search when not typing.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Navigate with arrows, press Enter to open, Esc to close.' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ⌘F / Ctrl+F and search for "docs".' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use ↑ / ↓ to move through results, Enter to open one.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Organize → "Tags = Instant Context"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t3.tag, updatedAt: t3.tag },
      { id: crypto.randomUUID(), name: 'search', color: 'purple', createdAt: t3.tag, updatedAt: t3.tag },
    ],
    codeBlocks: [],
    createdAt: t3.note,
    updatedAt: t3.note,
  });

  // NOTE 4: Tags
  const t4 = getTimestamps(3000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Tags = Instant Context',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Tags = Instant Context' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Type a word at the bottom, press Enter or comma. Twelve colors auto-rotate so you can scan quickly.' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Click a tag dot to recolor—updates everywhere that tag exists.' }],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add a tag (try "docs" or "team").' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Change its color using the dot.' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Search for that tag name via ⌘F / Ctrl+F.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Write fast → "Writing That Stays Out of the Way"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t4.tag, updatedAt: t4.tag },
      { id: crypto.randomUUID(), name: 'organization', color: 'rose', createdAt: t4.tag, updatedAt: t4.tag },
    ],
    codeBlocks: [],
    createdAt: t4.note,
    updatedAt: t4.note,
  });

  // NOTE 5: Editor
  const t5 = getTimestamps(4000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Writing That Stays Out of the Way',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Writing That Stays Out of the Way' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First line = title automatically.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Select text for a quick bubble: bold, italic, underline, strike, highlight.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Slash menu: type ' }, { type: 'text', marks: [{ type: 'code' }], text: '/' }, { type: 'text', text: ' on a new line for headings, lists, quotes, code.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Markdown-like: ## makes a heading, - makes a list, [] makes a task.' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bold a word and add a heading.' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Insert a task list item and check it.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Terminal → "Terminal, No Context Switch"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t5.tag, updatedAt: t5.tag },
      { id: crypto.randomUUID(), name: 'writing', color: 'indigo', createdAt: t5.tag, updatedAt: t5.tag },
    ],
    codeBlocks: [],
    createdAt: t5.note,
    updatedAt: t5.note,
  });

  // NOTE 6: Terminal
  const t6 = getTimestamps(5000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Terminal, No Context Switch',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Terminal, No Context Switch' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'A quake-style terminal with persistent state lives here. Open it without leaving your note.' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '⌘` / Ctrl+`' }, { type: 'text', text: ': toggle terminal.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'State persists: cd, env vars, functions stay between commands.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mobile shows Tab, Esc, Ctrl+C helpers.' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open the terminal (⌘` / Ctrl+`).' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Run ' }, { type: 'text', marks: [{ type: 'code' }], text: 'pwd' }, { type: 'text', text: ' then ' }, { type: 'text', marks: [{ type: 'code' }], text: 'ls' }, { type: 'text', text: ' to see state persist.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Master flow → "Keyboard Flow"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t6.tag, updatedAt: t6.tag },
      { id: crypto.randomUUID(), name: 'terminal', color: 'green', createdAt: t6.tag, updatedAt: t6.tag },
    ],
    codeBlocks: [
      {
        id: crypto.randomUUID(),
        code: '# Compare terminal vs code block\ncd /tmp\nexport NOTEBOOK="Sandbooks"\nprintf "workspace:%s\\n" "$NOTEBOOK"\npwd',
        language: 'bash',
        output: undefined,
        createdAt: t6.code,
        updatedAt: t6.code,
      },
    ],
    createdAt: t6.note,
    updatedAt: t6.note,
  });

  // NOTE 7: Keyboard Shortcuts
  const t7 = getTimestamps(6000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Keyboard Flow',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Keyboard Flow' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Stay on the keyboard and reduce friction. Mobile? Use the toolbar for the same power.' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '⌘F / Ctrl+F — Search' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '/ (idle) — Quick search' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'c — New note (when not typing)' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '⌘` / Ctrl+` — Terminal' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '⌘B / Ctrl+B — Toggle sidebar' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '⌘Enter / Ctrl+Enter — Run code block' }] }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Press ' }, { type: 'text', marks: [{ type: 'bold' }], text: '?' }, { type: 'text', text: ' to open the full shortcuts panel.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Next' },
            { type: 'text', text: ': Polish + resilience → "Polish + Resilience"' },
          ],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t7.tag, updatedAt: t7.tag },
      { id: crypto.randomUUID(), name: 'shortcuts', color: 'purple', createdAt: t7.tag, updatedAt: t7.tag },
    ],
    codeBlocks: [],
    createdAt: t7.note,
    updatedAt: t7.note,
  });

  // NOTE 8: Polish
  const t8 = getTimestamps(7000);
  notes.push({
    id: crypto.randomUUID(),
    title: 'Polish + Resilience',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Polish + Resilience' }],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Dark mode' }, { type: 'text', text: ': moon icon top-right.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Typewriter' }, { type: 'text', text: ': ⌘⇧T / Ctrl+Shift+T keeps the cursor centered.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Focus' }, { type: 'text', text: ': ⌘⇧F / Ctrl+Shift+F dims everything but the active paragraph.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sidebar: ⌘B / Ctrl+B on desktop; ≡ on mobile.' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export/Import: keep your data portable.' }] }] },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'If cloud execution is off or the slash icon appears, you can still edit—just re-enable to run code.' }],
        },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Toggle dark mode to see the contrast work.' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export your notes to confirm you have a backup.' }] }] },
          ],
        },
        {
          type: 'horizontalRule',
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Create your own note next (press ' }, { type: 'text', marks: [{ type: 'bold' }], text: 'c' }, { type: 'text', text: ' or click ' }, { type: 'text', marks: [{ type: 'bold' }], text: '+ New Note' }, { type: 'text', text: ').' }],
        },
      ],
    },
    tags: [
      { id: crypto.randomUUID(), name: 'docs', color: 'blue', createdAt: t8.tag, updatedAt: t8.tag },
      { id: crypto.randomUUID(), name: 'polish', color: 'pink', createdAt: t8.tag, updatedAt: t8.tag },
    ],
    codeBlocks: [],
    createdAt: t8.note,
    updatedAt: t8.note,
  });

  return notes;
}
