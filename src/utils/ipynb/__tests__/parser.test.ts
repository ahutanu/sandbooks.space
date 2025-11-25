import { describe, it, expect } from 'vitest';
import { parseIpynb, normalizeCellSource, normalizeOutputs, NotebookSchema } from '../parser';

describe('ipynb parser', () => {
  describe('NotebookSchema validation', () => {
    it('validates a valid notebook', () => {
      const validNotebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          {
            cell_type: 'code',
            source: 'print("hello")',
            outputs: [],
            execution_count: null
          }
        ]
      };

      expect(() => NotebookSchema.parse(validNotebook)).not.toThrow();
    });

    it('rejects invalid notebook format', () => {
      const invalidNotebook = {
        nbformat: 4,
        // missing required fields
        cells: []
      };

      expect(() => NotebookSchema.parse(invalidNotebook)).toThrow();
    });

    it('validates cells with all types', () => {
      const notebook = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {},
        cells: [
          { cell_type: 'code', source: 'x = 1' },
          { cell_type: 'markdown', source: '# Header' },
          { cell_type: 'raw', source: 'raw text' }
        ]
      };

      expect(() => NotebookSchema.parse(notebook)).not.toThrow();
    });
  });

  describe('normalizeCellSource', () => {
    it('converts string array to string', () => {
      const source = ['line 1\n', 'line 2\n', 'line 3'];
      expect(normalizeCellSource(source)).toBe('line 1\nline 2\nline 3');
    });

    it('returns string as-is', () => {
      const source = 'single line';
      expect(normalizeCellSource(source)).toBe('single line');
    });

    it('handles empty array', () => {
      expect(normalizeCellSource([])).toBe('');
    });

    it('handles empty string', () => {
      expect(normalizeCellSource('')).toBe('');
    });
  });

  describe('normalizeOutputs', () => {
    it('normalizes stream output', () => {
      const outputs = [
        {
          output_type: 'stream',
          name: 'stdout',
          text: 'Hello World'
        }
      ];

      const normalized = normalizeOutputs(outputs);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].output_type).toBe('stream');
      expect(normalized[0].name).toBe('stdout');
      expect(normalized[0].text).toBe('Hello World');
    });

    it('normalizes display_data output', () => {
      const outputs = [
        {
          output_type: 'display_data',
          data: {
            'text/plain': 'data',
            'image/png': 'base64string'
          },
          metadata: {}
        }
      ];

      const normalized = normalizeOutputs(outputs);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].output_type).toBe('display_data');
      expect(normalized[0].data).toHaveProperty('text/plain');
      expect(normalized[0].data).toHaveProperty('image/png');
    });

    it('normalizes error output', () => {
      const outputs = [
        {
          output_type: 'error',
          ename: 'ValueError',
          evalue: 'invalid value',
          traceback: ['line 1', 'line 2']
        }
      ];

      const normalized = normalizeOutputs(outputs);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].output_type).toBe('error');
      expect(normalized[0].ename).toBe('ValueError');
      expect(normalized[0].traceback).toEqual(['line 1', 'line 2']);
    });

    it('handles empty outputs array', () => {
      expect(normalizeOutputs([])).toEqual([]);
    });

    it('handles null/undefined', () => {
      expect(normalizeOutputs(null as unknown as unknown[])).toEqual([]);
      expect(normalizeOutputs(undefined as unknown as unknown[])).toEqual([]);
    });
  });

  describe('parseIpynb', () => {
    it('parses a simple notebook file', async () => {
      const notebookContent = JSON.stringify({
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
      });

      const file = new File([notebookContent], 'test.ipynb', { type: 'application/json' });
      const notebook = await parseIpynb(file);

      expect(notebook.nbformat).toBe(4);
      expect(notebook.cells).toHaveLength(2);
      expect(notebook.cells[0].cell_type).toBe('markdown');
      expect(notebook.cells[1].cell_type).toBe('code');
    });

    it('throws error for invalid JSON', async () => {
      const file = new File(['not json'], 'test.ipynb', { type: 'application/json' });

      await expect(parseIpynb(file)).rejects.toThrow('Failed to parse notebook');
    });

    it('throws error for invalid notebook schema', async () => {
      const invalidNotebook = JSON.stringify({
        nbformat: 'invalid', // should be number
        cells: []
      });

      const file = new File([invalidNotebook], 'test.ipynb', { type: 'application/json' });

      await expect(parseIpynb(file)).rejects.toThrow('Invalid notebook format');
    });
  });
});
