import type { ExecutionProviderInterface, ExecutionResult } from './types';
import type { Language } from '../../types';
import { hopxService } from '../hopx';

/**
 * Cloud Execution Provider
 * Wraps the existing Hopx service to provide cloud-based code execution
 */
export class CloudExecutionProvider implements ExecutionProviderInterface {
  readonly provider = 'cloud' as const;
  readonly name = 'Cloud Execution (Hopx)';

  async isAvailable(): Promise<boolean> {
    // Cloud execution is available if backend is reachable
    // In practice, we check this via health checks
    return true;
  }

  async executeCode(code: string, language: Language): Promise<ExecutionResult> {
    return await hopxService.executeCode(code, language);
  }

  async getHealth(): Promise<{ isHealthy: boolean; message?: string }> {
    // Health check would be done via backend API
    // For now, return a basic check
    return {
      isHealthy: true,
      message: 'Cloud execution available'
    };
  }

  async cleanup(): Promise<void> {
    await hopxService.cleanup();
  }
}

export const cloudExecutionProvider = new CloudExecutionProvider();


