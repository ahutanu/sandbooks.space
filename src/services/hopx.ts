// Backend API integration for code execution
import type { ExecutionResult, Language } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is required. Please create a .env file with VITE_API_URL=http://localhost:3001');
}

class HopxService {
  async executeCode(code: string, language: Language): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {})
        },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;

        return {
          stdout: '',
          stderr: message,
          exitCode: 1,
          executionTime: Date.now() - startTime,
          error: message,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        };
      }

      const result = await response.json();

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0,
        executionTime: result.executionTime || (Date.now() - startTime),
        richOutputs: result.richOutputs || [],
        error: result.error,
        sandboxStatus: result.sandboxStatus || 'healthy',
        recoverable: Boolean(result.recoverable ?? true),
      };
    } catch (error) {
      // Network error or backend unavailable
      return {
        stdout: '',
        stderr: '',
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Failed to connect to backend',
        sandboxStatus: 'unhealthy',
        recoverable: true,
      };
    }
  }

  async cleanup() {
    // No cleanup needed for HTTP client
  }
}

export const hopxService = new HopxService();
