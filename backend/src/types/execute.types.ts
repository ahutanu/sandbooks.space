import { z } from 'zod';

// Supported languages
export const SupportedLanguage = z.enum(['python', 'javascript', 'typescript', 'bash', 'go']);
export type SupportedLanguage = z.infer<typeof SupportedLanguage>;

// Request schema with validation
export const ExecuteRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty').max(100000, 'Code too long'),
  language: SupportedLanguage
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

// Rich output types
export interface RichOutput {
  type: string;
  data: string;
}

// Response interface
export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  richOutputs?: RichOutput[];
  error?: string;
}
