import type { ExecutionProviderInterface, ExecutionResult } from './types';
import type { Language } from '../../types';
import { isLocalExecutionSupported } from '../../utils/platform';

/**
 * Local Execution Provider
 * Code execution is disabled in local mode (run button hidden)
 * Terminal functionality is handled separately via LocalTerminalProvider
 */
export class LocalExecutionProvider implements ExecutionProviderInterface {
  readonly provider = 'local' as const;
  readonly name = 'Local Execution';

  async isAvailable(): Promise<boolean> {
    // Local execution (code blocks) is not available
    // Terminal is available separately
    return false;
  }

  async executeCode(_code: string, _language: Language): Promise<ExecutionResult> {
    // Code execution is disabled in local mode
    throw new Error('Code execution is not available in local mode. Use the terminal instead.');
  }

  async getHealth(): Promise<{ isHealthy: boolean; message?: string }> {
    const supported = await isLocalExecutionSupported();
    return {
      isHealthy: supported,
      message: supported 
        ? 'Local execution mode available (terminal only)' 
        : 'Local execution not available on this platform'
    };
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for local provider
  }
}

export const localExecutionProvider = new LocalExecutionProvider();

