import { nanoid } from 'nanoid';
import type { JSONContent } from '@tiptap/react';
import type { Note } from '../../types';
import type { Notebook, NotebookCell } from './parser';
import { normalizeCellSource, normalizeOutputs } from './parser';

/**
 * Convert .ipynb notebook to Sandbooks Note
 */
export function convertIpynbToNote(notebook: Notebook, filename?: string): Note {
  const content: JSONContent = {
    type: 'doc',
    content: []
  };

  // Convert cells to TipTap content
  for (const cell of notebook.cells) {
    const source = normalizeCellSource(cell.source);

    if (cell.cell_type === 'code') {
      // Code cells → executableCodeBlock nodes
      content.content?.push({
        type: 'executableCodeBlock',
        attrs: {
          code: source,
          language: 'python', // Default to Python
          executionCount: cell.execution_count || undefined,
          jupyterOutputs: cell.outputs ? normalizeOutputs(cell.outputs) : undefined,
          isExecuting: false
        }
      });
    } else if (cell.cell_type === 'markdown') {
      // Markdown cells → paragraph/heading nodes
      // Simple approach: split by lines and create paragraphs
      // TODO: Could use markdown parser for richer conversion
      const lines = source.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          // Check if heading
          const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
            content.content?.push({
              type: 'heading',
              attrs: { level },
              content: [{ type: 'text', text: headingMatch[2] }]
            });
          } else {
            content.content?.push({
              type: 'paragraph',
              content: [{ type: 'text', text: line }]
            });
          }
        }
      }
    }
    // raw cells are skipped for now
  }

  // Extract title from first heading or use filename
  let title = filename ? filename.replace('.ipynb', '') : 'Imported Notebook';
  const firstHeading = notebook.cells.find(cell => {
    if (cell.cell_type === 'markdown') {
      const source = normalizeCellSource(cell.source);
      return source.startsWith('#');
    }
    return false;
  });

  if (firstHeading) {
    const source = normalizeCellSource(firstHeading.source);
    const headingText = source.replace(/^#+\s*/, '').trim();
    if (headingText) {
      title = headingText;
    }
  }

  return {
    id: nanoid(),
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Convert Sandbooks Note to .ipynb format
 */
export function convertNoteToIpynb(note: Note): string {
  const cells: NotebookCell[] = [];

  if (!note.content.content) {
    throw new Error('Note has no content');
  }

  for (const node of note.content.content) {
    if (node.type === 'executableCodeBlock') {
      // ExecutableCodeBlock → code cell
      const code = (node.attrs?.code as string) || '';
      const executionCount = node.attrs?.executionCount as number | null | undefined;
      const jupyterOutputs = node.attrs?.jupyterOutputs as unknown[] | undefined;

      // Split code into lines, preserving newlines (Jupyter format)
      const lines = code.split('\n');
      const sourceLines = lines.map((line, i) =>
        i < lines.length - 1 ? line + '\n' : line
      );

      cells.push({
        cell_type: 'code',
        source: sourceLines,
        outputs: (jupyterOutputs as Record<string, unknown>[]) || [],
        execution_count: executionCount ?? null,
        metadata: {},
        id: nanoid()
      });
    } else if (node.type === 'heading') {
      // Heading → markdown cell
      const level = (node.attrs?.level as number) || 1;
      const text = extractText(node);
      const markdown = '#'.repeat(level) + ' ' + text;

      // Split into lines, preserving newlines (Jupyter format)
      const mdLines = markdown.split('\n');
      const mdSourceLines = mdLines.map((line, i) =>
        i < mdLines.length - 1 ? line + '\n' : line
      );

      cells.push({
        cell_type: 'markdown',
        source: mdSourceLines,
        metadata: {}
      });
    } else if (node.type === 'paragraph') {
      // Paragraph → markdown cell
      const text = extractText(node);
      if (text.trim()) {
        // Split into lines, preserving newlines (Jupyter format)
        const pLines = text.split('\n');
        const pSourceLines = pLines.map((line, i) =>
          i < pLines.length - 1 ? line + '\n' : line
        );

        cells.push({
          cell_type: 'markdown',
          source: pSourceLines,
          metadata: {}
        });
      }
    }
    // Other node types are skipped
  }

  const notebook: Notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3'
      },
      language_info: {
        name: 'python',
        version: '3.11'
      }
    },
    cells
  };

  return JSON.stringify(notebook, null, 2);
}

/**
 * Extract text content from a TipTap node
 */
function extractText(node: JSONContent): string {
  if (!node.content) {
    return '';
  }

  return node.content
    .map(child => {
      if (child.type === 'text') {
        return child.text || '';
      }
      if (child.content) {
        return extractText(child);
      }
      return '';
    })
    .join('');
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
