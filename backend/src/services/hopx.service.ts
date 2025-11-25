import { Sandbox, SandboxExpiredError, TokenExpiredError } from '@hopx-ai/sdk';
import env from '../config/env';
import logger from '../utils/logger';
import { HopxError, TimeoutError } from '../utils/errors';
import { SupportedLanguage, ExecuteResponse, RichOutput, DEFAULT_TIMEOUTS } from '../types/execute.types';
import type { HopxSandbox, HopxMetrics, ExpiryInfo } from '../types/hopx.types';
import { getErrorCode, getErrorMessage } from '../utils/errorUtils';

// Configuration - simplified with SDK 0.3.4
const CONFIG = {
  SANDBOX_TIMEOUT_SECONDS: 600,   // 10 minutes TTL
  EXPIRY_WARNING_THRESHOLD: 60,   // Warn 1 minute before expiry
  EXPIRY_CHECK_INTERVAL: 30,      // Check every 30 seconds
  RETRY_DELAYS_MS: [1000, 2000],  // 1s, 2s between retries
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  MAX_CONSECUTIVE_FAILURES: 3,    // Open circuit after 3 consecutive failures
  RECOVERY_TIMEOUT_MS: 30000,     // Try recovery after 30s in OPEN state
};

// Error classification
interface ClassifiedError {
  code: string;
  message: string;
  category: 'transient' | 'corruption' | 'network' | 'timeout' | 'expired' | 'token' | 'unknown';
  recoverable: boolean;
}

class HopxService {
  private apiKey: string;
  private sandbox: HopxSandbox | null = null;
  private sandboxId: string | null = null;

  // Circuit breaker state
  private consecutiveFailures: number = 0;
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private circuitOpenedAt: number | null = null;

  constructor() {
    this.apiKey = env.HOPX_API_KEY;
    logger.info('Hopx Service initialized (lazy mode - SDK 0.3.4)');
  }

  /**
   * Check circuit breaker state and throw if circuit is OPEN
   */
  private checkCircuitBreaker(): void {
    if (this.circuitState === 'OPEN') {
      const now = Date.now();
      const timeSinceOpen = now - (this.circuitOpenedAt || now);

      // Allow retry after recovery timeout
      if (timeSinceOpen >= CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT_MS) {
        logger.info('Circuit breaker entering HALF_OPEN state for recovery attempt');
        this.circuitState = 'HALF_OPEN';
        return;
      }

      logger.warn('Circuit breaker is OPEN - refusing connection attempts', {
        consecutiveFailures: this.consecutiveFailures,
        timeSinceOpen: `${Math.round(timeSinceOpen / 1000)}s`
      });
      throw new HopxError('Cloud connection unavailable - circuit breaker OPEN. Please try again in a moment.');
    }
  }

  /**
   * Record successful operation - reset circuit breaker
   */
  private recordSuccess(): void {
    if (this.consecutiveFailures > 0 || this.circuitState !== 'CLOSED') {
      logger.info('Operation successful - resetting circuit breaker', {
        previousState: this.circuitState,
        previousFailures: this.consecutiveFailures
      });
    }
    this.consecutiveFailures = 0;
    this.circuitState = 'CLOSED';
    this.circuitOpenedAt = null;
  }

  /**
   * Record failed operation - increment failure counter and open circuit if threshold exceeded
   */
  private recordFailure(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES) {
      this.circuitState = 'OPEN';
      this.circuitOpenedAt = Date.now();

      logger.error('Circuit breaker OPEN - too many consecutive failures', {
        consecutiveFailures: this.consecutiveFailures,
        maxAllowed: CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES
      });
    } else {
      logger.warn('Operation failed - incrementing failure counter', {
        consecutiveFailures: this.consecutiveFailures,
        maxAllowed: CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES
      });
    }
  }

  /**
   * Handle sandbox expiry warning - proactively recreate
   * SDK 0.3.4: Called by onExpiringSoon callback
   */
  private handleExpiringSoon = (info: ExpiryInfo): void => {
    logger.warn('Sandbox expiring soon - scheduling proactive refresh', {
      sandboxId: this.sandboxId,
      timeToExpiry: info.timeToExpiry ? `${info.timeToExpiry}s` : 'unknown',
      expiresAt: info.expiresAt?.toISOString()
    });

    // Trigger async recreation (don't await - let current operations complete)
    this.recreateSandbox().catch(err => {
      logger.error('Failed to proactively recreate expiring sandbox', {
        error: getErrorMessage(err)
      });
    });
  };

  /**
   * Create a sandbox instance with SDK 0.3.4 features
   */
  private async createSandboxInstance(): Promise<{ sandbox: HopxSandbox; sandboxId: string }> {
    try {
      logger.info('Creating Hopx sandbox (SDK 0.3.4)...', {
        timeout: `${CONFIG.SANDBOX_TIMEOUT_SECONDS}s`
      });

      const sandbox = await Sandbox.create({
        template: 'code-interpreter',
        apiKey: this.apiKey,
        timeoutSeconds: CONFIG.SANDBOX_TIMEOUT_SECONDS,
        // SDK 0.3.4: Expiry warning callback
        onExpiringSoon: this.handleExpiringSoon,
        expiryWarningThreshold: CONFIG.EXPIRY_WARNING_THRESHOLD
      }) as unknown as HopxSandbox;

      const sandboxId = sandbox.sandboxId;

      // SDK 0.3.4: Start background expiry monitoring
      sandbox.startExpiryMonitor(
        this.handleExpiringSoon,
        CONFIG.EXPIRY_WARNING_THRESHOLD,
        CONFIG.EXPIRY_CHECK_INTERVAL
      );

      logger.info('Hopx sandbox created successfully', {
        sandboxId,
        timeout: `${CONFIG.SANDBOX_TIMEOUT_SECONDS}s`
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
    // SDK 0.3.4: Stop expiry monitoring before clearing
    if (this.sandbox) {
      try {
        this.sandbox.stopExpiryMonitor();
      } catch {
        // Ignore - sandbox may already be dead
      }
    }
    this.sandbox = null;
    this.sandboxId = null;
  }

  /**
   * Get a healthy sandbox, creating or recreating as needed
   * SDK 0.3.4: Uses native isHealthy() and isExpiringSoon()
   */
  private async getHealthySandbox(): Promise<HopxSandbox> {
    // Check circuit breaker before attempting any operations
    this.checkCircuitBreaker();

    try {
      // Step 1: No sandbox exists - create new one (LAZY)
      if (!this.sandbox) {
        logger.info('No sandbox exists, creating on first use (lazy initialization)');
        return this.createSandbox();
      }

      // Step 2: SDK 0.3.4 - Use native isExpiringSoon() check
      const isExpiring = await this.sandbox.isExpiringSoon(CONFIG.EXPIRY_WARNING_THRESHOLD);
      if (isExpiring) {
        const expiryInfo = await this.sandbox.getExpiryInfo();
        logger.info('Sandbox expiring soon, recreating proactively', {
          sandboxId: this.sandboxId,
          timeToExpiry: expiryInfo.timeToExpiry ? `${expiryInfo.timeToExpiry}s` : 'unknown'
        });
        return this.recreateSandbox();
      }

      // Step 3: SDK 0.3.4 - Use native isHealthy() check
      const isHealthy = await this.sandbox.isHealthy();
      if (!isHealthy) {
        logger.warn('Sandbox health check failed, recreating');
        return this.recreateSandbox();
      }

      logger.debug('Using healthy sandbox', { sandboxId: this.sandboxId });
      return this.sandbox;

    } catch (error: unknown) {
      // SDK 0.3.4: Handle specific error types
      if (error instanceof SandboxExpiredError) {
        logger.warn('Sandbox expired (SDK detected), creating new one', {
          sandboxId: (error as SandboxExpiredError).sandboxId,
          expiresAt: (error as SandboxExpiredError).expiresAt
        });
        this.resetSandboxState();
        return this.createSandbox();
      }

      if (error instanceof TokenExpiredError) {
        logger.warn('Token expired (SDK detected), creating new sandbox');
        this.resetSandboxState();
        return this.createSandbox();
      }

      // Any unexpected failure should clear cached state and retry once
      logger.warn('Failed to get healthy sandbox, attempting auto-heal', {
        error: getErrorMessage(error)
      });
      this.resetSandboxState();
      return this.createSandbox();
    }
  }

  /**
   * Create a new sandbox instance
   */
  private async createSandbox(): Promise<HopxSandbox> {
    try {
      const { sandbox, sandboxId } = await this.createSandboxInstance();
      this.sandbox = sandbox;
      this.sandboxId = sandboxId;

      // Record successful sandbox creation
      this.recordSuccess();

      return this.sandbox;
    } catch (error) {
      // Record failure - this will increment consecutive failures
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Recreate sandbox (destroy old + create new)
   */
  private async recreateSandbox(): Promise<HopxSandbox> {
    const oldSandboxId = this.sandboxId;

    // Destroy old sandbox
    if (this.sandbox) {
      try {
        // SDK 0.3.4: Stop monitoring before killing
        this.sandbox.stopExpiryMonitor();
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
   * SDK 0.3.4: Use native error types for better detection
   */
  private classifyError(error: unknown): ClassifiedError {
    // SDK 0.3.4: Check for specific SDK error types first
    if (error instanceof SandboxExpiredError) {
      return {
        code: 'SANDBOX_EXPIRED',
        message: getErrorMessage(error),
        category: 'expired',
        recoverable: true
      };
    }

    if (error instanceof TokenExpiredError) {
      return {
        code: 'TOKEN_EXPIRED',
        message: getErrorMessage(error),
        category: 'token',
        recoverable: true
      };
    }

    const code = getErrorCode(error) || 'UNKNOWN';
    const message = getErrorMessage(error);
    const normalizedMessage = (message || '').toLowerCase();

    // Transient errors - auto-retry
    if (code === 'ETIMEDOUT' || code === 'ECONNRESET') {
      return { code, message, category: 'transient', recoverable: true };
    }

    // Network errors - retry
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ENETUNREACH') {
      return { code, message, category: 'network', recoverable: true };
    }

    // Timeout errors
    if (code === 'EXECUTION_TIMEOUT' || normalizedMessage.includes('timeout')) {
      return { code, message, category: 'timeout', recoverable: true };
    }

    // Expired/Not found - patterns for backward compatibility
    if (
      code === 'NOT_FOUND' || code === 'GONE' ||
      normalizedMessage.includes('expired') ||
      normalizedMessage.includes('not found') ||
      normalizedMessage.includes('invalid')
    ) {
      return { code, message, category: 'expired', recoverable: true };
    }

    // Corruption errors - recreate sandbox
    if (code === 'INTERNAL_ERROR' || code === 'PERMISSION_DENIED' || code === 'EXECUTION_FAILED') {
      return { code, message, category: 'corruption', recoverable: true };
    }

    // Unknown errors - still try to recover once
    return { code, message, category: 'unknown', recoverable: true };
  }

  /**
   * Execute code with automatic recovery
   * SDK 0.3.4: Uses preflight option for health checks
   */
  private async executeWithRecovery(
    code: string,
    language: SupportedLanguage,
    options: { timeout?: number } = {},
    attempt: number = 0
  ): Promise<ExecuteResponse> {
    const maxAttempts = CONFIG.RETRY_DELAYS_MS.length + 1;

    try {
      const sandbox = await this.getHealthySandbox();
      const runtimeLanguage = language === 'typescript' ? 'javascript' : language;
      const executionTimeout = options.timeout ?? DEFAULT_TIMEOUTS[language] ?? 120; // SDK 0.3.4 default is 120s

      logger.debug('Executing code', {
        language,
        timeout: `${executionTimeout}s`,
        attempt: attempt + 1,
        sandboxId: this.sandboxId
      });

      // SDK 0.3.4: Use preflight option for automatic health check before execution
      const result = await sandbox.runCode(code, {
        language: runtimeLanguage,
        timeout: executionTimeout,
        preflight: true // SDK 0.3.4: Ensures sandbox is healthy before execution
      }).catch((err: unknown) => {
        logger.error('Hopx runCode failed', {
          sandboxId: this.sandboxId,
          attempt: attempt + 1,
          error: getErrorMessage(err),
          code: getErrorCode(err),
          errorType: err?.constructor?.name
        });
        throw err;
      });

      const normalizedRichOutputs: RichOutput[] = Array.isArray(result.richOutputs)
        ? result.richOutputs.map((output) => ({
            type: String((output as { type?: unknown }).type ?? 'text'),
            data: String((output as { data?: unknown }).data ?? '')
          }))
        : [];

      // Record successful execution
      this.recordSuccess();

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
      logger.error('Hopx execution error', {
        category: classified.category,
        code: classified.code,
        message: classified.message,
        attempt: attempt + 1,
        sandboxId: this.sandboxId
      });

      // SDK 0.3.4: Use error type for smart recovery
      // Expired/token errors and unknown errors - reset state and auto-retry once
      const shouldResetAndRetry = ['corruption', 'expired', 'token', 'unknown'].includes(classified.category);

      if (shouldResetAndRetry && attempt === 0) {
        logger.info('Sandbox error detected - auto-recovering with fresh sandbox', {
          category: classified.category,
          originalError: classified.message
        });

        this.resetSandboxState();
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.executeWithRecovery(code, language, options, attempt + 1);
      }

      // For transient errors (network, timeout), retry without resetting sandbox
      if (['transient', 'network', 'timeout'].includes(classified.category) &&
          attempt < maxAttempts - 1 && classified.recoverable) {
        const delay = CONFIG.RETRY_DELAYS_MS[attempt];

        logger.info('Retrying execution for transient error', {
          attempt: attempt + 2,
          delay: `${delay}ms`,
          category: classified.category
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRecovery(code, language, options, attempt + 1);
      }

      // All retries exhausted or non-recoverable error
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Public API: Execute code with automatic recovery and retry
   * @param code - Code to execute
   * @param language - Programming language
   * @param options.timeout - Optional execution timeout in seconds (SDK 0.3.4 default: 120s)
   */
  async executeCode(
    code: string,
    language: SupportedLanguage,
    options: { timeout?: number } = {}
  ): Promise<ExecuteResponse> {
    const startTime = Date.now();
    const effectiveTimeout = options.timeout ?? DEFAULT_TIMEOUTS[language] ?? 120;
    logger.info('Executing code', {
      language,
      codeLength: code.length,
      timeout: `${effectiveTimeout}s`
    });

    // Overall timeout is capped at MAX_EXECUTION_TIMEOUT from env config
    const overallTimeoutMs = Math.min(effectiveTimeout, env.MAX_EXECUTION_TIMEOUT) * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError('Execution timed out')), overallTimeoutMs);
    });

    try {
      const result = await Promise.race([
        this.executeWithRecovery(code, language, options),
        timeoutPromise
      ]);
      const executionTime = Date.now() - startTime;

      logger.info('Code execution completed', {
        language,
        executionTime,
        exitCode: result.exitCode,
        sandboxId: this.sandboxId
      });

      return { ...result, executionTime };
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
   */
  async getSandbox(): Promise<HopxSandbox> {
    return this.getHealthySandbox();
  }

  /**
   * Public API: Create an isolated sandbox (not shared)
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
      sandbox.stopExpiryMonitor();
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
   * Public API: Force recreate sandbox
   */
  async forceRecreateSandbox(): Promise<{ sandboxId: string }> {
    logger.info('Force recreating sandbox');
    await this.recreateSandbox();
    return { sandboxId: this.sandboxId! };
  }

  /**
   * Public API: Get current sandbox health
   * SDK 0.3.4: Uses native health and expiry methods
   */
  async getHealth(): Promise<{
    status: string;
    isHealthy: boolean;
    message?: string;
    features?: Record<string, unknown>;
    uptime?: number;
    version?: string;
    sandboxId?: string | null;
    expiry?: {
      timeToExpiry: number | null;
      isExpiringSoon: boolean;
      expiresAt: string | null;
    };
    metrics?: {
      uptime: number;
      executions: number;
      errors: number;
      errorRate: number;
      avgDuration: number;
    } | null;
    error?: string;
    circuitBreaker?: {
      state: string;
      consecutiveFailures: number;
      maxFailures: number;
    };
  }> {
    if (!this.sandbox) {
      return {
        status: 'no_sandbox',
        isHealthy: false,
        message: 'No sandbox exists',
        circuitBreaker: {
          state: this.circuitState,
          consecutiveFailures: this.consecutiveFailures,
          maxFailures: CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES
        }
      };
    }

    try {
      // SDK 0.3.4: Use native health check
      const isHealthy = await this.sandbox.isHealthy();
      const health = await this.sandbox.getHealth();
      const expiryInfo = await this.sandbox.getExpiryInfo();
      const metrics: HopxMetrics | null = await this.sandbox.getAgentMetrics().catch(() => null);

      return {
        status: health.status,
        isHealthy,
        features: health.features,
        uptime: health.uptime_seconds ?? 0,
        version: health.version,
        sandboxId: this.sandboxId,
        expiry: {
          timeToExpiry: expiryInfo.timeToExpiry,
          isExpiringSoon: expiryInfo.isExpiringSoon,
          expiresAt: expiryInfo.expiresAt?.toISOString() ?? null
        },
        metrics: metrics ? {
          uptime: metrics.uptime_seconds ?? 0,
          executions: metrics.total_executions ?? 0,
          errors: metrics.error_count ?? 0,
          errorRate: (metrics.error_count ?? 0) / Math.max(metrics.requests_total ?? 1, 1),
          avgDuration: metrics.avg_duration_ms ?? 0
        } : null,
        circuitBreaker: {
          state: this.circuitState,
          consecutiveFailures: this.consecutiveFailures,
          maxFailures: CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES
        }
      };
    } catch (error: unknown) {
      logger.error('Failed to get health', { error: getErrorMessage(error) });
      return {
        status: 'unknown',
        isHealthy: false,
        error: getErrorMessage(error),
        circuitBreaker: {
          state: this.circuitState,
          consecutiveFailures: this.consecutiveFailures,
          maxFailures: CIRCUIT_BREAKER_CONFIG.MAX_CONSECUTIVE_FAILURES
        }
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
      return { exists: false, message: 'No sandbox exists' };
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
      return { exists: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Public API: Destroy current sandbox
   */
  async destroySandbox(): Promise<void> {
    if (this.sandbox) {
      try {
        logger.info('Destroying sandbox', { sandboxId: this.sandboxId });
        this.sandbox.stopExpiryMonitor();
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
        this.sandbox.stopExpiryMonitor();
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
