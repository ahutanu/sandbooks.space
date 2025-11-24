import type { Language } from '../../types';

export type ExecutionProvider = 'cloud' | 'local';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: number;
  richOutputs?: Array<{
    type: string;
    data: string; // base64 encoded for images
  }>;
  error?: string;
  sandboxStatus?: 'healthy' | 'recovering' | 'unhealthy' | 'unknown' | 'creating';
  recoverable?: boolean; // Can retry/restart
}

export interface ExecutionProviderInterface {
  readonly provider: ExecutionProvider;
  readonly name: string;
  readonly isAvailable: () => Promise<boolean>;
  executeCode: (code: string, language: Language) => Promise<ExecutionResult>;
  getHealth?: () => Promise<{ isHealthy: boolean; message?: string }>;
  cleanup?: () => Promise<void>;
}

