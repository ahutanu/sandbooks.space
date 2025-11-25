import { Sandbox } from '@hopx-ai/sdk';
import env from '../config/env';
import logger from '../utils/logger';
import { HopxError } from '../utils/errors';
import type { HopxSandbox } from '../types/hopx.types';
import type { ExecuteCellResponse, KernelSessionInfo } from '../types/notebook.types';
import { KernelSession } from './kernelSession';
import { getErrorMessage } from '../utils/errorUtils';

// Cleanup interval: check for timed-out sessions every 2 minutes (reduced for faster cleanup)
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

// Sandbox configuration for notebooks - optimized for minimal resource usage
const NOTEBOOK_SANDBOX_CONFIG = {
  TIMEOUT_SECONDS: 600, // 10 minutes (reduced from 2 hours to match code sandbox TTL)
  TEMPLATE: 'code-interpreter'
};

/**
 * Service to manage notebook kernel sessions
 * Each note gets its own persistent sandbox for stateful execution
 */
class NotebookKernelService {
  private apiKey: string;
  private sessions: Map<string, KernelSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiKey = env.HOPX_API_KEY;
    logger.info('Notebook Kernel Service initialized');
    this.startCleanupJob();
  }

  /**
   * Start periodic cleanup job to remove timed-out sessions
   */
  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupTimedOutSessions().catch((error) => {
        logger.error('Cleanup job failed', { error: getErrorMessage(error) });
      });
    }, CLEANUP_INTERVAL_MS);

    logger.info('Cleanup job started', {
      intervalMs: CLEANUP_INTERVAL_MS
    });
  }

  /**
   * Stop cleanup job (for graceful shutdown)
   */
  private stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cleanup job stopped');
    }
  }

  /**
   * Clean up sessions that have timed out due to inactivity
   */
  private async cleanupTimedOutSessions(): Promise<void> {
    const timedOutSessions: string[] = [];

    // Find timed-out sessions
    for (const [noteId, session] of this.sessions.entries()) {
      if (session.isTimedOut()) {
        timedOutSessions.push(noteId);
      }
    }

    if (timedOutSessions.length === 0) {
      logger.debug('No timed-out sessions to clean up', {
        activeSessions: this.sessions.size
      });
      return;
    }

    logger.info('Cleaning up timed-out sessions', {
      count: timedOutSessions.length,
      noteIds: timedOutSessions
    });

    // Destroy timed-out sessions
    for (const noteId of timedOutSessions) {
      try {
        await this.destroySession(noteId);
      } catch (error: unknown) {
        logger.error('Failed to destroy timed-out session', {
          noteId,
          error: getErrorMessage(error)
        });
      }
    }

    logger.info('Cleanup completed', {
      destroyed: timedOutSessions.length,
      remaining: this.sessions.size
    });
  }

  /**
   * Create a new sandbox instance for a notebook
   */
  private async createSandbox(): Promise<{ sandbox: HopxSandbox; sandboxId: string }> {
    try {
      logger.info('Creating notebook sandbox', {
        timeout: `${NOTEBOOK_SANDBOX_CONFIG.TIMEOUT_SECONDS}s`,
        template: NOTEBOOK_SANDBOX_CONFIG.TEMPLATE
      });

      const sandbox = await Sandbox.create({
        template: NOTEBOOK_SANDBOX_CONFIG.TEMPLATE,
        apiKey: this.apiKey,
        timeoutSeconds: NOTEBOOK_SANDBOX_CONFIG.TIMEOUT_SECONDS
      }) as unknown as HopxSandbox;

      const sandboxId = sandbox.sandboxId;

      logger.info('Notebook sandbox created', {
        sandboxId,
        timeout: `${NOTEBOOK_SANDBOX_CONFIG.TIMEOUT_SECONDS}s`
      });

      return { sandbox, sandboxId };

    } catch (error: unknown) {
      const message = getErrorMessage(error) || 'Failed to create sandbox';
      logger.error('Failed to create notebook sandbox', { error: message });
      throw new HopxError(message);
    }
  }

  /**
   * Get or create a kernel session for a note
   */
  public async getOrCreateSession(noteId: string): Promise<KernelSession> {
    // Check if session already exists
    if (this.sessions.has(noteId)) {
      const session = this.sessions.get(noteId)!;

      // Check if session is still healthy (not timed out)
      if (!session.isTimedOut()) {
        logger.debug('Using existing kernel session', {
          noteId,
          sandboxId: session.sandboxId,
          executionCount: session.executionCount
        });
        return session;
      }

      // Session timed out - destroy and recreate
      logger.info('Session timed out, recreating', {
        noteId,
        sandboxId: session.sandboxId
      });
      await this.destroySession(noteId);
    }

    // Create new session
    logger.info('Creating new kernel session', { noteId });

    try {
      const { sandbox, sandboxId } = await this.createSandbox();
      const session = new KernelSession(noteId, sandbox, sandboxId);

      this.sessions.set(noteId, session);

      logger.info('Kernel session created and cached', {
        noteId,
        sandboxId,
        totalSessions: this.sessions.size
      });

      return session;

    } catch (error: unknown) {
      logger.error('Failed to create kernel session', {
        noteId,
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Check if error indicates sandbox expiration
   */
  private isSandboxExpiredError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();
    return (
      message.includes('invalid or expired') ||
      message.includes('token expired') ||
      message.includes('session expired') ||
      message.includes('sandbox expired') ||
      message.includes('sandbox not found') ||
      message.includes('not found') ||
      message.includes('invalid token') ||
      message.includes('invalid session')
    );
  }

  /**
   * Execute a code cell in a notebook
   * Includes auto-recovery for expired sandboxes
   */
  public async executeCell(noteId: string, code: string, isRetry: boolean = false): Promise<ExecuteCellResponse> {
    logger.info('Executing notebook cell', {
      noteId,
      codeLength: code.length,
      isRetry
    });

    try {
      const session = await this.getOrCreateSession(noteId);
      const result = await session.executeCell(code);

      // Check if result contains sandbox expiration error
      const hasExpiredError = result.outputs.some(output => {
        if (output.output_type === 'error') {
          const errorOutput = output as { evalue?: string; ename?: string };
          const errorText = `${errorOutput.ename || ''} ${errorOutput.evalue || ''}`.toLowerCase();
          return (
            errorText.includes('invalid or expired') ||
            errorText.includes('token expired') ||
            errorText.includes('invalid token')
          );
        }
        return false;
      });

      // If we got an expiration error in the output, retry with fresh session
      if (hasExpiredError && !isRetry) {
        logger.info('Sandbox expired error detected in output, recreating session', {
          noteId,
          sandboxId: session.sandboxId
        });
        await this.destroySession(noteId);
        return this.executeCell(noteId, code, true);
      }

      logger.info('Cell execution completed', {
        noteId,
        sandboxId: session.sandboxId,
        execution_count: result.execution_count,
        outputCount: result.outputs.length,
        executionTime: result.executionTime
      });

      return result;

    } catch (error: unknown) {
      // Check if this is a sandbox expiration error
      if (this.isSandboxExpiredError(error) && !isRetry) {
        logger.info('Sandbox expired error caught, recreating session and retrying', {
          noteId,
          error: getErrorMessage(error)
        });

        // Destroy the expired session
        await this.destroySession(noteId).catch(() => {
          // Ignore destroy errors - session may already be dead
        });

        // Retry with a fresh session
        return this.executeCell(noteId, code, true);
      }

      logger.error('Cell execution failed', {
        noteId,
        error: getErrorMessage(error),
        isRetry
      });
      throw error;
    }
  }

  /**
   * Restart kernel for a notebook (clears execution count, keeps sandbox alive)
   */
  public async restartKernel(noteId: string): Promise<void> {
    logger.info('Restarting kernel', { noteId });

    const session = this.sessions.get(noteId);
    if (!session) {
      logger.warn('No kernel session to restart', { noteId });
      return;
    }

    session.restart();

    logger.info('Kernel restarted', {
      noteId,
      sandboxId: session.sandboxId
    });
  }

  /**
   * Destroy a kernel session and its sandbox
   */
  public async destroySession(noteId: string): Promise<void> {
    logger.info('Destroying kernel session', { noteId });

    const session = this.sessions.get(noteId);
    if (!session) {
      logger.warn('No kernel session to destroy', { noteId });
      return;
    }

    try {
      await session.destroy();
      this.sessions.delete(noteId);

      logger.info('Kernel session destroyed and removed', {
        noteId,
        remainingSessions: this.sessions.size
      });

    } catch (error: unknown) {
      logger.error('Failed to destroy kernel session', {
        noteId,
        error: getErrorMessage(error)
      });
      // Remove from map anyway
      this.sessions.delete(noteId);
      throw error;
    }
  }

  /**
   * Get session info for a notebook
   */
  public getSessionInfo(noteId: string): KernelSessionInfo | null {
    const session = this.sessions.get(noteId);
    if (!session) {
      return null;
    }

    return {
      noteId: session.noteId,
      sandboxId: session.sandboxId,
      executionCount: session.executionCount,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    };
  }

  /**
   * Get info for all active sessions
   */
  public getAllSessionsInfo(): KernelSessionInfo[] {
    return Array.from(this.sessions.values()).map(session => ({
      noteId: session.noteId,
      sandboxId: session.sandboxId,
      executionCount: session.executionCount,
      status: session.status,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }));
  }

  /**
   * Get count of active sessions
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Cleanup all sessions (for graceful shutdown)
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up all kernel sessions', {
      count: this.sessions.size
    });

    // Stop cleanup job
    this.stopCleanupJob();

    // Destroy all sessions
    const destroyPromises = Array.from(this.sessions.keys()).map(noteId =>
      this.destroySession(noteId).catch(error => {
        logger.error('Failed to destroy session during cleanup', {
          noteId,
          error: getErrorMessage(error)
        });
      })
    );

    await Promise.all(destroyPromises);

    logger.info('All kernel sessions cleaned up');
  }
}

export default new NotebookKernelService();
