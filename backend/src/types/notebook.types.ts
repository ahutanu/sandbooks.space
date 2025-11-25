import { z } from 'zod';

// Jupyter output types following nbformat spec
export interface JupyterOutput {
  output_type: 'stream' | 'display_data' | 'execute_result' | 'error';

  // For stream outputs
  name?: 'stdout' | 'stderr';
  text?: string;

  // For display_data and execute_result
  data?: {
    'text/plain'?: string;
    'text/html'?: string;
    'text/latex'?: string;
    'image/png'?: string;
    'image/jpeg'?: string;
    'image/svg+xml'?: string;
    'application/json'?: unknown;
    'application/vnd.plotly.v1+json'?: unknown;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  execution_count?: number;

  // For error outputs
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

// Execute cell request
export const ExecuteCellRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty').max(100000, 'Code too long')
});

export type ExecuteCellRequest = z.infer<typeof ExecuteCellRequestSchema>;

// Execute cell response
export interface ExecuteCellResponse {
  outputs: JupyterOutput[];
  execution_count: number;
  executionTime?: number;
}

// Kernel session status
export type KernelStatus = 'idle' | 'busy' | 'starting' | 'dead';

// Kernel session info
export interface KernelSessionInfo {
  noteId: string;
  sandboxId: string;
  executionCount: number;
  status: KernelStatus;
  createdAt: Date;
  lastActivity: Date;
}
