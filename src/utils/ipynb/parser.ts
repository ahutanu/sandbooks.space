import { z } from 'zod';
import type { JupyterOutput } from '../../types/notebook';

// Jupyter notebook cell schema (nbformat v4.5)
const CellSchema = z.object({
  cell_type: z.enum(['code', 'markdown', 'raw']),
  source: z.union([z.string(), z.array(z.string())]),
  outputs: z.array(z.record(z.string(), z.unknown())).optional(),
  execution_count: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  id: z.string().optional()
});

export type NotebookCell = z.infer<typeof CellSchema>;

// Jupyter notebook schema (nbformat v4.5)
export const NotebookSchema = z.object({
  nbformat: z.number(),
  nbformat_minor: z.number(),
  metadata: z.record(z.string(), z.unknown()),
  cells: z.array(CellSchema)
});

export type Notebook = z.infer<typeof NotebookSchema>;

/**
 * Parse and validate .ipynb file
 */
export async function parseIpynb(file: File): Promise<Notebook> {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const notebook = NotebookSchema.parse(json);
    return notebook;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid notebook format: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`);
    }
    throw new Error(`Failed to parse notebook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalize cell source to string
 */
export function normalizeCellSource(source: string | string[]): string {
  return Array.isArray(source) ? source.join('') : source;
}

/**
 * Normalize outputs to Jupyter output format
 */
export function normalizeOutputs(outputs: unknown[]): JupyterOutput[] {
  if (!outputs || !Array.isArray(outputs)) {
    return [];
  }

  return outputs.map(output => {
    const out = output as Record<string, unknown>;
    return {
      output_type: out.output_type as JupyterOutput['output_type'],
      name: out.name as 'stdout' | 'stderr' | undefined,
      text: out.text as string | undefined,
      data: out.data as JupyterOutput['data'],
      metadata: out.metadata as Record<string, unknown> | undefined,
      execution_count: out.execution_count as number | undefined,
      ename: out.ename as string | undefined,
      evalue: out.evalue as string | undefined,
      traceback: out.traceback as string[] | undefined
    };
  });
}
