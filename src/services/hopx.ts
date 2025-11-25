// Backend API integration for code execution
import type { ExecutionResult, Language } from '../types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

// Default timeouts per language (in seconds) - matches backend
const DEFAULT_TIMEOUTS: Record<Language, number> = {
  python: 120,      // 2 min - allows for pip install
  javascript: 60,   // 1 min
  typescript: 60,   // 1 min
  bash: 120,        // 2 min - shell scripts can be slow
  go: 60,           // 1 min
};

// Maximum timeout (5 minutes) - prevents abuse
const MAX_TIMEOUT_SECONDS = 300;

// Network buffer added to execution timeout for HTTP request
const NETWORK_BUFFER_MS = 30000; // 30 seconds buffer

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is required. Please create a .env file with VITE_API_URL=http://localhost:3001');
}

export interface ExecuteOptions {
  /** Execution timeout in seconds (default: language-based, max: 300) */
  timeout?: number;
}

class HopxService {
  /**
   * Execute code on the backend
   * @param code - Code to execute
   * @param language - Programming language
   * @param options.timeout - Optional timeout in seconds (uses language default if not specified)
   */
  async executeCode(
    code: string,
    language: Language,
    options: ExecuteOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Calculate timeout: user-specified or language default, capped at max
    const executionTimeout = Math.min(
      options.timeout ?? DEFAULT_TIMEOUTS[language] ?? 60,
      MAX_TIMEOUT_SECONDS
    );

    // HTTP timeout = execution timeout + network buffer
    const httpTimeoutMs = (executionTimeout * 1000) + NETWORK_BUFFER_MS;

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {})
          },
          body: JSON.stringify({
            code,
            language,
            ...(options.timeout ? { timeout: executionTimeout } : {})
          }),
        },
        httpTimeoutMs
      );

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
