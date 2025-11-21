import { Sandbox } from '@hopx-ai/sdk';
import env from '../config/env';
import logger from '../utils/logger';
import { HopxError, TimeoutError } from '../utils/errors';
import { SupportedLanguage, ExecuteResponse, RichOutput } from '../types/execute.types';
import type { HopxSandbox, HopxHealth, HopxMetrics } from '../types/hopx.types';
import { getErrorCode, getErrorMessage } from '../utils/errorUtils';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  CACHE_DURATION_MS: 30000,      // 30 seconds cache
  SANDBOX_TIMEOUT_SECONDS: 3600, // 1 hour auto-kill
  EXPIRY_BUFFER_MS: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  RETRY_DELAYS_MS: [2000, 5000]  // 2s, 5s between retries
};

// Error classification
interface ClassifiedError {
  code: string;
  message: string;
  category: 'transient' | 'corruption' | 'network' | 'timeout' | 'auth' | 'expired' | 'unknown';
  recoverable: boolean;
}

class HopxService {
  private apiKey: string;
  private sandbox: HopxSandbox | null = null;
  private lastHealthCheck: number = 0;
  private sandboxId: string | null = null;
  private sandboxCreatedAt: number | null = null;

  constructor() {
    this.apiKey = env.HOPX_API_KEY;
    logger.info('Hopx Service initialized');
  }

  /**
   * Create a sandbox instance with shared configuration
   */
  private async createSandboxInstance(): Promise<{ sandbox: HopxSandbox; sandboxId: string }> {
    try {
      logger.info('Creating Hopx sandbox...', {
        timeout: `${HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS}s`
      });

      const sandbox = await Sandbox.create({
        template: 'code-interpreter',
        apiKey: this.apiKey,
        timeoutSeconds: HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS
      }) as unknown as HopxSandbox;

      const sandboxId = sandbox.sandboxId;

      logger.info('Hopx sandbox created successfully', {
        sandboxId,
        timeout: `${HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS}s`
      });

      return { sandbox, sandboxId };
    } catch (error: unknown) {
      const message = getErrorMessage(error) || 'Failed to create sandbox';
      logger.error('Failed to create Hopx sandbox', { error: message });
      throw new HopxError(message);
    }
  }

  /**
   * Reset cached sandbox state so the next call forces recreation
   */
  private resetSandboxState(): void {
    this.sandbox = null;
    this.sandboxId = null;
    this.lastHealthCheck = 0;
    this.sandboxCreatedAt = null;
  }

  /**
   * Determine if the current sandbox is nearing expiry (Hopx TTL is 1h)
   */
  private isSandboxExpiringSoon(): boolean {
    if (!this.sandboxCreatedAt) {
      return false;
    }

    const ageMs = Date.now() - this.sandboxCreatedAt;
    const maxAgeMs = Math.max(
      (HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS * 1000) - HEALTH_CHECK_CONFIG.EXPIRY_BUFFER_MS,
      0
    );

    return ageMs >= maxAgeMs;
  }

  /**
   * Get a healthy sandbox, creating or recreating as needed
   * Uses 30s health check cache to minimize overhead
   */
  private async getHealthySandbox(): Promise<HopxSandbox> {
    try {
      // Step 1: No sandbox exists - create new one
      if (!this.sandbox) {
        logger.info('No sandbox exists, creating new one');
        return this.createSandbox();
      }

      // Step 2: Sandbox is nearing expiry - proactively refresh
      if (this.isSandboxExpiringSoon()) {
        logger.info('Sandbox nearing expiry, recreating proactively', {
          sandboxId: this.sandboxId
        });
        return this.recreateSandbox();
      }

      // Step 3: Recent health check passed - return cached sandbox
      const timeSinceLastCheck = Date.now() - this.lastHealthCheck;
      if (timeSinceLastCheck < HEALTH_CHECK_CONFIG.CACHE_DURATION_MS) {
        logger.debug('Using cached healthy sandbox', {
          cacheAge: `${Math.round(timeSinceLastCheck / 1000)}s`
        });
        return this.sandbox;
      }

      // Step 4: Perform health check
      const isHealthy = await this.checkHealth();
      if (isHealthy) {
        this.lastHealthCheck = Date.now();
        logger.debug('Health check passed', { sandboxId: this.sandboxId });
        return this.sandbox;
      }

      // Step 5: Health check failed - recreate sandbox
      logger.warn('Health check failed, recreating sandbox');
      return this.recreateSandbox();
    } catch (error: unknown) {
      // Any unexpected failure should clear cached state and retry once
      logger.warn('Failed to get healthy sandbox, attempting auto-heal', {
        error: getErrorMessage(error)
      });
      this.resetSandboxState();
      return this.createSandbox();
    }
  }

  /**
   * Check if current sandbox is healthy
   * Validates status, features, and error rate
   */
  private async checkHealth(): Promise<boolean> {
    if (!this.sandbox) {
      return false;
    }

    try {
      // Get health status
      const health: HopxHealth = await this.sandbox.getHealth();

      // Check status
      if (health.status !== 'ok') {
        logger.warn('Sandbox status not ok', {
          status: health.status,
          sandboxId: this.sandboxId
        });
        return false;
      }

      // Check code execution capability
      if (!health.features?.code_execution) {
        logger.warn('Code execution not available', {
          features: health.features,
          sandboxId: this.sandboxId
        });
        return false;
      }

      // Optional: Check metrics for high error rate
      try {
        const metrics: HopxMetrics = await this.sandbox.getAgentMetrics();
        const errorRate = metrics.error_count / Math.max(metrics.requests_total, 1);

        if (errorRate > 0.5) {
          logger.warn('High error rate detected', {
            errorRate: `${(errorRate * 100).toFixed(2)}%`,
            errors: metrics.error_count,
            requests: metrics.requests_total,
            sandboxId: this.sandboxId
          });
          return false;
        }

        logger.debug('Health check metrics', {
          uptime: `${metrics.uptime_seconds}s`,
          executions: metrics.total_executions,
          errors: metrics.error_count,
          avgDuration: `${metrics.avg_duration_ms}ms`
        });
      } catch (metricsError) {
        // Metrics failure is not critical
        logger.debug('Failed to get metrics, continuing', { error: metricsError });
      }

      return true;

    } catch (error: unknown) {
      logger.error('Health check threw error', {
        error: getErrorMessage(error),
        sandboxId: this.sandboxId
      });
      return false;
    }
  }

  /**
   * Create a new sandbox instance
   */
  private async createSandbox(): Promise<HopxSandbox> {
    const { sandbox, sandboxId } = await this.createSandboxInstance();
    const now = Date.now();
    this.sandbox = sandbox;
    this.sandboxId = sandboxId;
    this.lastHealthCheck = now;
    this.sandboxCreatedAt = now;
    return this.sandbox;
  }

  /**
   * Recreate sandbox (destroy old + create new)
   */
  private async recreateSandbox(): Promise<HopxSandbox> {
    const oldSandboxId = this.sandboxId;

    // Destroy old sandbox
    if (this.sandbox) {
      try {
        logger.info('Destroying old sandbox', { sandboxId: oldSandboxId });
        await this.sandbox.kill();
        logger.info('Old sandbox destroyed', { sandboxId: oldSandboxId });
      } catch (error: unknown) {
      logger.error('Failed to kill old sandbox', {
        error: getErrorMessage(error),
        sandboxId: oldSandboxId
      });
        // Continue anyway - create new sandbox
      }
    }

    // Create new sandbox
    this.resetSandboxState();
    return this.createSandbox();
  }

  /**
   * Classify error for recovery strategy
   */
  private classifyError(error: unknown): ClassifiedError {
    const code = getErrorCode(error) || 'UNKNOWN';
    const message = getErrorMessage(error);
    const normalizedMessage = (message || '').toLowerCase();

    // Transient errors - auto-retry
    if (code === 'ETIMEDOUT' || code === 'ECONNRESET') {
      return {
        code,
        message,
        category: 'transient',
        recoverable: true
      };
    }

    // Auth/API key errors - recreate and retry
    if (
      code === 'UNAUTHORIZED' ||
      code === 'FORBIDDEN' ||
      normalizedMessage.includes('hopx_api_key') ||
      normalizedMessage.includes('api key')
    ) {
      return {
        code,
        message,
        category: 'auth',
        recoverable: true
      };
    }

    // Expired/Not found sandboxes - recreate
    if (
      code === 'NOT_FOUND' ||
      normalizedMessage.includes('sandbox not found') ||
      normalizedMessage.includes('sandbox expired') ||
      normalizedMessage.includes('sandbox is not running')
    ) {
      return {
        code,
        message,
        category: 'expired',
        recoverable: true
      };
    }

    // Corruption errors - recreate sandbox
    if (code === 'INTERNAL_ERROR' || code === 'PERMISSION_DENIED' || code === 'EXECUTION_FAILED') {
      return {
        code,
        message,
        category: 'corruption',
        recoverable: true
      };
    }

    // Network errors - retry
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ENETUNREACH') {
      return {
        code,
        message,
        category: 'network',
        recoverable: true
      };
    }

    // Timeout errors - may need recreation
    if (code === 'EXECUTION_TIMEOUT' || message.includes('timeout')) {
      return {
        code,
        message,
        category: 'timeout',
        recoverable: true
      };
    }

    // Unknown errors
    return {
      code,
      message,
      category: 'unknown',
      recoverable: false
    };
  }

  /**
   * Execute code with automatic recovery
   * Implements 2-level retry: silent (2s) → visible (5s)
   */
  private async executeWithRecovery(
    code: string,
    language: SupportedLanguage,
    attempt: number = 0
  ): Promise<ExecuteResponse> {
    const maxAttempts = HEALTH_CHECK_CONFIG.RETRY_DELAYS_MS.length + 1; // Initial + retries

    try {
      const sandbox = await this.getHealthySandbox();
      const runtimeLanguage = language === 'typescript' ? 'javascript' : language;

      logger.debug('Executing code', {
        language,
        attempt: attempt + 1,
        sandboxId: this.sandboxId
      });

      const result = await sandbox.runCode(code, { language: runtimeLanguage }).catch((err: unknown) => {
        logger.error('Hopx runCode failed', {
          sandboxId: this.sandboxId,
          attempt: attempt + 1,
          error: getErrorMessage(err),
          code: getErrorCode(err)
        });
        throw err;
      });

      const normalizedRichOutputs: RichOutput[] = Array.isArray(result.richOutputs)
        ? result.richOutputs.map((output) => ({
            type: String((output as { type?: unknown }).type ?? 'text'),
            data: String((output as { data?: unknown }).data ?? '')
          }))
        : [];

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exit_code || 0,
        executionTime: Number(result.execution_time ?? 0),
        richOutputs: normalizedRichOutputs,
        error: result.exit_code !== 0 ? result.stderr : undefined
      };

    } catch (error: unknown) {
      const classified = this.classifyError(error);
      logger.error('Hopx execution error (classified)', {
        category: classified.category,
        code: classified.code,
        message: classified.message,
        attempt: attempt + 1,
        sandboxId: this.sandboxId
      });

      logger.error('Code execution failed', {
        attempt: attempt + 1,
        maxAttempts,
        category: classified.category,
        code: classified.code,
        message: classified.message,
        sandboxId: this.sandboxId
      });

      // If error indicates sandbox corruption/expiry/auth issues, force sandbox recreation
      if (['corruption', 'auth', 'expired'].includes(classified.category)) {
        logger.warn('Error indicates sandbox needs recreation', {
          category: classified.category
        });
        this.resetSandboxState();
      }

      // Retry logic
      if (attempt < maxAttempts - 1 && classified.recoverable) {
        const delay = HEALTH_CHECK_CONFIG.RETRY_DELAYS_MS[attempt];

        logger.info('Retrying execution', {
          attempt: attempt + 2,
          delay: `${delay}ms`,
          category: classified.category
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // Recursive retry
        return this.executeWithRecovery(code, language, attempt + 1);
      }

      // All retries exhausted or non-recoverable error
      throw error;
    }
  }

  /**
   * Public API: Execute code with automatic recovery and retry
   */
  async executeCode(code: string, language: SupportedLanguage): Promise<ExecuteResponse> {
    const startTime = Date.now();
    logger.info('Executing code', { language, codeLength: code.length });
    const overallTimeoutMs = env.MAX_EXECUTION_TIMEOUT * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError('Execution timed out')), overallTimeoutMs);
    });

    try {
      const result = await Promise.race([
        this.executeWithRecovery(code, language),
        timeoutPromise
      ]);
      const executionTime = Date.now() - startTime;

      logger.info('Code execution completed', {
        language,
        executionTime,
        exitCode: result.exitCode,
        sandboxId: this.sandboxId
      });

      return {
        ...result,
        executionTime
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      const message = getErrorMessage(error) || 'Unknown execution error';

      logger.error('Code execution failed after all recovery attempts', {
        language,
        error: message,
        executionTime,
        sandboxId: this.sandboxId
      });

      if (error instanceof TimeoutError) {
        throw error;
      }

      const maybeCode = getErrorCode(error);
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes('timeout') || normalizedMessage.includes('timed out') || maybeCode === 'ETIMEDOUT') {
        throw new TimeoutError(`Execution exceeded timeout`);
      }

      throw new HopxError(message);
    }
  }

  /**
   * Public API: Get the sandbox instance for terminal commands
   * Used by TerminalSessionManager for executing shell commands
   */
  async getSandbox(): Promise<HopxSandbox> {
    return this.getHealthySandbox();
  }

  /**
   * Public API: Create an isolated sandbox (not shared)
   * Used for per-session terminal sandboxes to avoid cross-user state leakage
   */
  async createIsolatedSandbox(): Promise<{ sandbox: HopxSandbox; sandboxId: string }> {
    const { sandbox, sandboxId } = await this.createSandboxInstance();
    return { sandbox, sandboxId };
  }

  /**
   * Public API: Destroy a specific sandbox instance
   */
  async destroySandboxInstance(sandbox: HopxSandbox, sandboxId?: string): Promise<void> {
    if (!sandbox) return;

    try {
      await sandbox.kill();
      logger.info('Sandbox destroyed', { sandboxId });
    } catch (error: unknown) {
      logger.error('Failed to destroy sandbox instance', {
        sandboxId,
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Public API: Force recreate sandbox (for toggle or manual restart)
   */
  async forceRecreateSandbox(): Promise<{ sandboxId: string }> {
    logger.info('Force recreating sandbox');
    await this.recreateSandbox();
    return { sandboxId: this.sandboxId! };
  }

  /**
   * Public API: Get current sandbox health
   */
  async getHealth(): Promise<{
    status: string;
    isHealthy: boolean;
    message?: string;
    features?: Record<string, unknown>;
    uptime?: number;
    version?: string;
    sandboxId?: string | null;
    metrics?: {
      uptime: number;
      executions: number;
      errors: number;
      errorRate: number;
      avgDuration: number;
    } | null;
    error?: string;
  }> {
    if (!this.sandbox) {
      return {
        status: 'no_sandbox',
        isHealthy: false,
        message: 'No sandbox exists'
      };
    }

    try {
      const health = await this.sandbox.getHealth();
      const metrics = await this.sandbox.getAgentMetrics().catch(() => null);

      return {
        status: health.status,
        isHealthy: Boolean(health.status === 'ok' && (health.features as { code_execution?: unknown })?.code_execution),
        features: health.features,
        uptime: health.uptime_seconds ?? 0,
        version: health.version,
        sandboxId: this.sandboxId,
        metrics: metrics ? {
          uptime: metrics.uptime_seconds ?? 0,
          executions: metrics.total_executions ?? 0,
          errors: metrics.error_count ?? 0,
          errorRate: (metrics.error_count ?? 0) / Math.max(metrics.requests_total ?? 1, 1),
          avgDuration: metrics.avg_duration_ms ?? 0
        } : null
      };
    } catch (error: unknown) {
      logger.error('Failed to get health', { error: getErrorMessage(error) });
      return {
        status: 'unknown',
        isHealthy: false,
        error: getErrorMessage(error)
      };
    }
  }

  /**
   * Public API: Get sandbox info (ID, status, resources)
   */
  async getSandboxInfo(): Promise<{
    exists: boolean;
    message?: string;
    sandboxId?: string | null;
    status?: string;
    resources?: unknown;
    expiresAt?: string;
    createdAt?: string;
    error?: string;
  }> {
    if (!this.sandbox) {
      return {
        exists: false,
        message: 'No sandbox exists'
      };
    }

    try {
      const info = await this.sandbox.getInfo();
      return {
        exists: true,
        sandboxId: this.sandboxId,
        status: info.status,
        resources: info.resources,
        expiresAt: info.expiresAt,
        createdAt: info.createdAt
      };
    } catch (error: unknown) {
      logger.error('Failed to get sandbox info', { error: getErrorMessage(error) });
      return {
        exists: false,
        error: getErrorMessage(error)
      };
    }
  }

  /**
   * Public API: Destroy current sandbox
   */
  async destroySandbox(): Promise<void> {
    if (this.sandbox) {
      try {
        logger.info('Destroying sandbox', { sandboxId: this.sandboxId });
        await this.sandbox.kill();
        logger.info('Sandbox destroyed', { sandboxId: this.sandboxId });
      } catch (error: unknown) {
        logger.error('Failed to destroy sandbox', {
          error: getErrorMessage(error),
          sandboxId: this.sandboxId
        });
        throw error;
      } finally {
        this.resetSandboxState();
      }
    }
  }

  /**
   * Cleanup sandbox on server shutdown
   */
  async cleanup() {
    if (this.sandbox) {
      try {
        await this.sandbox.kill();
        logger.info('Hopx sandbox cleaned up');
      } catch (error: unknown) {
        logger.error('Error cleaning up sandbox', { error: getErrorMessage(error) });
      } finally {
        this.resetSandboxState();
      }
    }
  }
}

export default new HopxService();
