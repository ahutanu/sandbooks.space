import { Sandbox } from '@hopx-ai/sdk';
import env from '../config/env';
import logger from '../utils/logger';
import { HopxError, TimeoutError } from '../utils/errors';
import { SupportedLanguage, ExecuteResponse, RichOutput } from '../types/execute.types';
import type { HopxSandbox, HopxHealth, HopxMetrics } from '../types/hopx.types';
import { getErrorCode, getErrorMessage } from '../utils/errorUtils';

// Health check configuration - optimized for minimal sandbox creation
const HEALTH_CHECK_CONFIG = {
  CACHE_DURATION_MS: 60000,       // 60 seconds cache - reduced API calls
  SANDBOX_TIMEOUT_SECONDS: 600,   // 10 minutes TTL (reduced from 1 hour)
  EXPIRY_BUFFER_MS: 60 * 1000,    // Refresh 1 minute before expiry (reduced from 5 min)
  RETRY_DELAYS_MS: [1000, 2000],  // 1s, 2s between retries
  ACTIVITY_EXTENSION_MS: 5 * 60 * 1000, // Extend sandbox by 5 min on activity
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
  category: 'transient' | 'corruption' | 'network' | 'timeout' | 'auth' | 'expired' | 'unknown';
  recoverable: boolean;
}

class HopxService {
  private apiKey: string;
  private sandbox: HopxSandbox | null = null;
  private lastHealthCheck: number = 0;
  private sandboxId: string | null = null;
  private sandboxCreatedAt: number | null = null;
  private lastActivityAt: number | null = null; // Track last user activity

  // Circuit breaker state
  private consecutiveFailures: number = 0;
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private circuitOpenedAt: number | null = null;

  constructor() {
    this.apiKey = env.HOPX_API_KEY;
    logger.info('Hopx Service initialized (lazy mode - no sandbox created until first use)');
  }

  /**
   * Record user activity to extend sandbox lifetime
   * Called on code execution to keep sandbox alive during active use
   */
  private recordActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /**
   * Get effective TTL based on activity
   * If user is active, extend sandbox lifetime
   */
  private getEffectiveTtlMs(): number {
    const baseTtl = HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS * 1000;

    // If there's recent activity, we can use the full TTL
    // The sandbox will auto-extend on the Hopx side if we're actively using it
    return baseTtl;
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
    this.lastActivityAt = null;
  }

  /**
   * Determine if the current sandbox is nearing expiry (TTL is 10 min)
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
   * Uses 60s health check cache to minimize overhead (lazy creation pattern)
   */
  private async getHealthySandbox(): Promise<HopxSandbox> {
    // Check circuit breaker before attempting any operations
    this.checkCircuitBreaker();

    // Record activity for sandbox lifetime extension
    this.recordActivity();

    try {
      // Step 1: No sandbox exists - create new one (LAZY - only when actually needed)
      if (!this.sandbox) {
        logger.info('No sandbox exists, creating on first use (lazy initialization)');
        return this.createSandbox();
      }

      // Step 2: Sandbox is nearing expiry - proactively refresh
      // But only if not recently active (to avoid unnecessary recreation during active use)
      if (this.isSandboxExpiringSoon()) {
        logger.info('Sandbox nearing expiry, recreating proactively', {
          sandboxId: this.sandboxId,
          age: this.sandboxCreatedAt ? `${Math.round((Date.now() - this.sandboxCreatedAt) / 1000)}s` : 'unknown'
        });
        return this.recreateSandbox();
      }

      // Step 3: Recent health check passed - return cached sandbox (60s cache)
      const timeSinceLastCheck = Date.now() - this.lastHealthCheck;
      if (timeSinceLastCheck < HEALTH_CHECK_CONFIG.CACHE_DURATION_MS) {
        logger.debug('Using cached healthy sandbox', {
          cacheAge: `${Math.round(timeSinceLastCheck / 1000)}s`,
          ttlRemaining: this.sandboxCreatedAt
            ? `${Math.round((HEALTH_CHECK_CONFIG.SANDBOX_TIMEOUT_SECONDS * 1000 - (Date.now() - this.sandboxCreatedAt)) / 1000)}s`
            : 'unknown'
        });
        return this.sandbox;
      }

      // Step 4: Perform health check (only if cache expired)
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
    try {
      const { sandbox, sandboxId } = await this.createSandboxInstance();
      const now = Date.now();
      this.sandbox = sandbox;
      this.sandboxId = sandboxId;
      this.lastHealthCheck = now;
      this.sandboxCreatedAt = now;

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

      // If error indicates sandbox corruption/expiry/auth issues, reset state and fail fast (no retry)
      // The next call to getHealthySandbox will handle recreation
      if (['corruption', 'auth', 'expired'].includes(classified.category)) {
        logger.warn('Error indicates sandbox needs recreation - failing fast without retry', {
          category: classified.category
        });
        this.resetSandboxState();
        this.recordFailure(); // Record failure for circuit breaker
        throw error; // Fail fast - no retries for sandbox-level errors
      }

      // Retry logic for transient errors only (network, timeout, unknown)
      if (attempt < maxAttempts - 1 && classified.recoverable) {
        const delay = HEALTH_CHECK_CONFIG.RETRY_DELAYS_MS[attempt];

        logger.info('Retrying execution for transient error', {
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
      this.recordFailure(); // Record failure for circuit breaker
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
