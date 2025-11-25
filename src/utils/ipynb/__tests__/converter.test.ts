import { describe, it, expect } from 'vitest';
import { convertIpynbToNote, convertNoteToIpynb } from '../converter';
import type { Notebook } from '../parser';
import type { Note } from '../../../types';

describe('ipynb converter', () => {
  describe('convertIpynbToNote', () => {
    it('converts simple notebook to note', () => {
      const notebook: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'markdown',
            source: '# Test Notebook'
          },
          {
            cell_type: 'code',
            source: 'print("hello")',
            outputs: [],
            execution_count: 1
          }
        ]
      };

      const note = convertIpynbToNote(notebook, 'test.ipynb');

      expect(note.title).toBe('Test Notebook');
      expect(note.content.type).toBe('doc');
      expect(note.content.content).toHaveLength(2);
    });

    it('extracts title from first heading', () => {
      const notebook: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'markdown',
            source: '# My Analysis Notebook'
          }
        ]
      };

      const note = convertIpynbToNote(notebook);

      expect(note.title).toBe('My Analysis Notebook');
    });

    it('uses filename when no heading present', () => {
      const notebook: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'code',
            source: 'x = 1'
          }
        ]
      };

      const note = convertIpynbToNote(notebook, 'mynotebook.ipynb');

      expect(note.title).toBe('mynotebook');
    });

    it('converts code cells to executableCodeBlock nodes', () => {
      const notebook: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'code',
            source: ['import pandas as pd\n', 'df = pd.DataFrame()'],
            execution_count: 5,
            outputs: [
              {
                output_type: 'stream',
                name: 'stdout',
                text: 'output'
              }
            ]
          }
        ]
      };

      const note = convertIpynbToNote(notebook);

      const codeBlock = note.content.content?.[0];
      expect(codeBlock?.type).toBe('executableCodeBlock');
      expect(codeBlock?.attrs?.code).toBe('import pandas as pd\ndf = pd.DataFrame()');
      expect(codeBlock?.attrs?.language).toBe('python');
      expect(codeBlock?.attrs?.executionCount).toBe(5);
      expect(codeBlock?.attrs?.jupyterOutputs).toHaveLength(1);
    });

    it('converts markdown cells to paragraphs/headings', () => {
      const notebook: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'markdown',
            source: '## Section Header'
          },
          {
            cell_type: 'markdown',
            source: 'Regular paragraph text'
          }
        ]
      };

      const note = convertIpynbToNote(notebook);

      expect(note.content.content).toHaveLength(2);
      expect(note.content.content?.[0]?.type).toBe('heading');
      expect(note.content.content?.[0]?.attrs?.level).toBe(2);
      expect(note.content.content?.[1]?.type).toBe('paragraph');
    });
  });

  describe('convertNoteToIpynb', () => {
    it('converts note with code blocks to ipynb', () => {
      const note: Note = {
        id: 'test',
        title: 'Test Note',
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'My Notebook' }]
            },
            {
              type: 'executableCodeBlock',
              attrs: {
                code: 'print("hello")',
                language: 'python',
                executionCount: 1,
                jupyterOutputs: [
                  {
                    output_type: 'stream',
                    name: 'stdout',
                    text: 'hello\n'
                  }
                ]
              }
            }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const ipynb = convertNoteToIpynb(note);
      const parsed = JSON.parse(ipynb);

      expect(parsed.nbformat).toBe(4);
      expect(parsed.nbformat_minor).toBe(5);
      expect(parsed.cells).toHaveLength(2);
      expect(parsed.cells[0].cell_type).toBe('markdown');
      expect(parsed.cells[1].cell_type).toBe('code');
      expect(parsed.cells[1].execution_count).toBe(1);
      expect(parsed.cells[1].outputs).toHaveLength(1);
    });

    it('preserves code block source correctly', () => {
      const code = 'import pandas as pd\ndf = pd.DataFrame()\nprint(df)';
      const note: Note = {
        id: 'test',
        title: 'Test',
        content: {
          type: 'doc',
          content: [
            {
              type: 'executableCodeBlock',
              attrs: {
                code,
                language: 'python'
              }
            }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const ipynb = convertNoteToIpynb(note);
      const parsed = JSON.parse(ipynb);

      expect(parsed.cells[0].source.join('')).toBe(code);
    });

    it('throws error for note with no content', () => {
      const note: Note = {
        id: 'test',
        title: 'Test',
        content: {
          type: 'doc'
          // no content array
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(() => convertNoteToIpynb(note)).toThrow('Note has no content');
    });
  });

  describe('round-trip conversion', () => {
    it('maintains data fidelity for simple notebook', () => {
      const original: Notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'markdown',
            source: '# Test'
          },
          {
            cell_type: 'code',
            source: 'x = 42',
            execution_count: 1,
            outputs: []
          }
        ]
      };

      // Import
      const note = convertIpynbToNote(original);

      // Export
      const exported = convertNoteToIpynb(note);
      const parsed = JSON.parse(exported);

      // Verify structure preserved
      expect(parsed.nbformat).toBe(4);
      expect(parsed.cells).toHaveLength(2);
      expect(parsed.cells[1].source.join('')).toBe('x = 42');
      expect(parsed.cells[1].execution_count).toBe(1);
    });
  });
});
