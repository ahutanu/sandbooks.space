import { Response } from 'express';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import hopxService from './hopx.service';
import logger from '../utils/logger';
import {
  TerminalSession,
  SSEClient,
  SSEEvent,
  CleanupResult,
  SessionStats,
  SessionNotFoundError,
  SessionDestroyedError,
  CommandExecutionError
} from '../types/terminal.types';
import type { HopxSandbox } from '../types/hopx.types';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Configuration constants
 */
const CONFIG = {
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  HEARTBEAT_INTERVAL_MS: 30 * 1000,   // 30 seconds
  MAX_COMMAND_HISTORY: 100,            // Keep last 100 commands
  MAX_SESSIONS: 50                     // Hard limit on concurrent sessions
};

/**
 * Terminal Session Manager
 * Manages terminal sessions, SSE clients, and command execution
 * Singleton pattern - single instance per server
 */
class TerminalSessionManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private sseClients: Map<string, SSEClient[]> = new Map(); // sessionId -> clients
  private sessionSandboxes: Map<string, { sandbox: HopxSandbox; sandboxId: string }> = new Map();
  private sessionWebSockets: Map<string, WebSocket> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupJob();
    this.startHeartbeatJob();
    logger.info('TerminalSessionManager initialized');
  }

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * Create a new terminal session
   * Reuses the shared Hopx sandbox from HopxService
   */
  async createSession(): Promise<TerminalSession> {
    // Check session limit
    if (this.sessions.size >= CONFIG.MAX_SESSIONS) {
      logger.warn('Max sessions reached, cleaning up old sessions');
      await this.cleanupInactiveSessions();
    }

    const sessionId = randomUUID();
    const now = Date.now();
    let sandboxEntry: { sandbox: HopxSandbox; sandboxId: string } | null = null;

    try {
      // Dedicated sandbox per session to avoid cross-user state leakage
      sandboxEntry = await hopxService.createIsolatedSandbox();
      const { sandbox, sandboxId } = sandboxEntry;

      const session: TerminalSession = {
        sessionId,
        sandboxId,
        status: 'active',
        createdAt: now,
        lastActivityAt: now,
        commandHistory: []
      };

      this.sessions.set(sessionId, session);
      this.sseClients.set(sessionId, []);
      this.sessionSandboxes.set(sessionId, { sandbox, sandboxId });

      // Connect to WebSocket terminal
      try {
        await sandbox.init();
        logger.debug('Sandbox initialized for terminal', { sessionId });

        const ws = await sandbox.terminal.connect();
        this.sessionWebSockets.set(sessionId, ws);

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.broadcastToSession(sessionId, {
              type: 'terminal_message',
              data: message
            });
          } catch (parseError) {
            logger.error('Failed to parse terminal message', {
              sessionId,
              error: getErrorMessage(parseError)
            });
          }
        });

        ws.on('error', (error) => {
          logger.error('Terminal WebSocket error', {
            sessionId,
            error: getErrorMessage(error)
          });
          this.broadcastToSession(sessionId, {
            type: 'error',
            data: { message: 'Terminal connection error', error: getErrorMessage(error) }
          });
        });

        ws.on('close', () => {
          logger.info('Terminal WebSocket closed', { sessionId });
          this.sessionWebSockets.delete(sessionId);
          this.broadcastToSession(sessionId, {
            type: 'info',
            data: { message: 'Terminal connection closed' }
          });
        });

        logger.info('Terminal WebSocket connected', { sessionId });

      } catch (wsError: unknown) {
        logger.error('Failed to connect terminal WebSocket', {
          sessionId,
          error: getErrorMessage(wsError)
        });
        await hopxService.destroySandboxInstance(sandbox, sandboxId);
        throw new CommandExecutionError(`Failed to connect terminal: ${getErrorMessage(wsError)}`);
      }

      logger.info('Terminal session created', {
        sessionId,
        sandboxId,
        totalSessions: this.sessions.size
      });

      return session;

    } catch (error: unknown) {
      logger.error('Failed to create terminal session', {
        sessionId,
        error: getErrorMessage(error)
      });
      if (sandboxEntry) {
        await hopxService.destroySandboxInstance(sandboxEntry.sandbox, sandboxEntry.sandboxId).catch(() => {
          // Ignore cleanup errors during creation failures
        });
      }
      throw new CommandExecutionError(`Failed to create session: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    if (session.status === 'destroyed') {
      throw new SessionDestroyedError(sessionId);
    }

    return session;
  }

  /**
   * Destroy a session and disconnect all clients
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    try {
      // Mark as destroyed
      session.status = 'destroyed';

      // Notify all connected clients
      await this.broadcastToSession(sessionId, {
        type: 'session_destroyed',
        data: { sessionId, message: 'Session has been destroyed' }
      });

      // Disconnect all SSE clients
      const clients = this.sseClients.get(sessionId) || [];
      for (const client of clients) {
        try {
          client.response.end();
        } catch (_error) {
          // Ignore errors on closing
        }
      }

      // Close WebSocket
      const ws = this.sessionWebSockets.get(sessionId);
      if (ws) {
        try {
          ws.close();
        } catch (_error) {
          // Ignore errors on closing
        }
        this.sessionWebSockets.delete(sessionId);
      }

      // Destroy dedicated sandbox for this session
      await this.destroySessionSandbox(sessionId);

      // Clean up
      this.sessions.delete(sessionId);
      this.sseClients.delete(sessionId);

      logger.info('Terminal session destroyed', {
        sessionId,
        remainingSessions: this.sessions.size
      });

    } catch (error: unknown) {
      logger.error('Error destroying session', {
        sessionId,
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();

      // Update status based on activity
      if (session.status === 'idle') {
        session.status = 'active';
      }
    }
  }

  /**
   * Get sandbox for a session
   */
  private getSessionSandbox(sessionId: string): { sandbox: HopxSandbox; sandboxId: string } {
    const sandboxEntry = this.sessionSandboxes.get(sessionId);

    if (!sandboxEntry) {
      throw new CommandExecutionError('Sandbox not found for session');
    }

    return sandboxEntry;
  }

  /**
   * Destroy and remove sandbox for a session
   */
  private async destroySessionSandbox(sessionId: string): Promise<void> {
    const sandboxEntry = this.sessionSandboxes.get(sessionId);

    if (!sandboxEntry) {
      return;
    }

    try {
      await hopxService.destroySandboxInstance(sandboxEntry.sandbox, sandboxEntry.sandboxId);
    } catch (error: unknown) {
      logger.error('Failed to destroy session sandbox', {
        sessionId,
        error: getErrorMessage(error)
      });
    } finally {
      this.sessionSandboxes.delete(sessionId);
    }
  }

  // ============================================================================
  // TERMINAL INPUT/OUTPUT
  // ============================================================================

  /**
   * Send input to terminal session (replaces executeCommand)
   */
  async sendInput(sessionId: string, data: string): Promise<void> {
    this.getSession(sessionId);
    const ws = this.sessionWebSockets.get(sessionId);

    if (!ws) {
      throw new CommandExecutionError('Terminal WebSocket not connected');
    }

    this.updateSessionActivity(sessionId);

    const { sandbox } = this.getSessionSandbox(sessionId);

    try {
      sandbox.terminal.sendInput(ws, data);
      logger.debug('Sent input to terminal', {
        sessionId,
        dataLength: data.length
      });
    } catch (error: unknown) {
      logger.error('Failed to send input to terminal', {
        sessionId,
        error: getErrorMessage(error)
      });
      throw new CommandExecutionError(`Failed to send input: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Resize terminal dimensions
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const ws = this.sessionWebSockets.get(sessionId);

    if (!ws) {
      throw new CommandExecutionError('Terminal WebSocket not connected');
    }

    const { sandbox } = this.getSessionSandbox(sessionId);

    try {
      sandbox.terminal.resize(ws, cols, rows);
      logger.debug('Terminal resized', { sessionId, cols, rows });
    } catch (error: unknown) {
      logger.error('Failed to resize terminal', {
        sessionId,
        error: getErrorMessage(error)
      });
      throw new CommandExecutionError(`Failed to resize: ${getErrorMessage(error)}`);
    }
  }

  // ============================================================================
  // SSE CLIENT MANAGEMENT
  // ============================================================================

  /**
   * Register an SSE client for a session
   * @throws SessionNotFoundError if session doesn't exist
   * @throws SessionDestroyedError if session is destroyed
   */
  registerSSEClient(sessionId: string, response: Response): SSEClient {
    // Validate session exists and is active
    // This will throw SessionNotFoundError or SessionDestroyedError if invalid
    const session = this.getSession(sessionId);

    const clientId = randomUUID();
    const now = Date.now();

    const client: SSEClient = {
      clientId,
      sessionId,
      response,
      connectedAt: now,
      lastHeartbeat: now
    };

    // Add to session's client list
    const clients = this.sseClients.get(sessionId) || [];
    clients.push(client);
    this.sseClients.set(sessionId, clients);

    this.updateSessionActivity(sessionId);

    logger.info('SSE client connected', {
      clientId,
      sessionId,
      totalClients: clients.length,
      sandboxId: session.sandboxId
    });

    // Setup client disconnect handler
    response.on('close', () => {
      logger.debug('Client connection closed', { clientId, sessionId });
      this.unregisterSSEClient(sessionId, clientId);
    });

    // Setup error handler
    response.on('error', (error: unknown) => {
      logger.error('Client connection error', {
        clientId,
        sessionId,
        error: getErrorMessage(error)
      });
      this.unregisterSSEClient(sessionId, clientId);
    });

    // Send connection confirmation
    this.sendSSEEvent(client, {
      type: 'connected',
      data: { sessionId, clientId, sandboxId: session.sandboxId }
    });

    return client;
  }

  /**
   * Unregister an SSE client
   */
  private unregisterSSEClient(sessionId: string, clientId: string): void {
    const clients = this.sseClients.get(sessionId);

    if (clients) {
      const filtered = clients.filter(c => c.clientId !== clientId);
      this.sseClients.set(sessionId, filtered);

      logger.info('SSE client disconnected', {
        clientId,
        sessionId,
        remainingClients: filtered.length
      });

      // If no clients left, mark session as idle
      if (filtered.length === 0) {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'active') {
          session.status = 'idle';
        }
      }
    }
  }

  /**
   * Broadcast event to all clients in a session
   */
  private async broadcastToSession(sessionId: string, event: SSEEvent): Promise<void> {
    const clients = this.sseClients.get(sessionId) || [];

    for (const client of clients) {
      try {
        this.sendSSEEvent(client, event);
      } catch (error: unknown) {
        logger.error('Failed to send SSE event', {
          clientId: client.clientId,
          sessionId,
          error: getErrorMessage(error)
        });
      }
    }
  }

  /**
   * Send SSE event to a specific client
   */
  private sendSSEEvent(client: SSEClient, event: SSEEvent): void {
    const eventData = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    const sseMessage = `event: ${event.type}\ndata: ${JSON.stringify(eventData.data)}\n\n`;

    try {
      client.response.write(sseMessage);
    } catch (error: unknown) {
      logger.error('Failed to write SSE message', {
        clientId: client.clientId,
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeats(): void {
    const now = Date.now();
    let totalClients = 0;

    for (const [_sessionId, clients] of this.sseClients.entries()) {
      for (const client of clients) {
        try {
          this.sendSSEEvent(client, {
            type: 'heartbeat',
            data: { timestamp: now }
          });
          client.lastHeartbeat = now;
          totalClients++;
        } catch (_error) {
          // Client disconnected, will be cleaned up by close handler
        }
      }
    }

    if (totalClients > 0) {
      logger.debug('Heartbeats sent', { totalClients });
    }
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  /**
   * Cleanup inactive sessions (30+ min without activity)
   */
  async cleanupInactiveSessions(): Promise<CleanupResult> {
    const now = Date.now();
    const cutoff = now - CONFIG.SESSION_TIMEOUT_MS;

    const sessionsToClean: string[] = [];
    const errors: Array<{ sessionId: string; error: string }> = [];

    // Find inactive sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivityAt < cutoff && session.status !== 'destroyed') {
        sessionsToClean.push(sessionId);
      }
    }

    logger.info('Starting session cleanup', {
      totalSessions: this.sessions.size,
      sessionsToClean: sessionsToClean.length
    });

    // Destroy inactive sessions
    for (const sessionId of sessionsToClean) {
      try {
        await this.destroySession(sessionId);
      } catch (error: unknown) {
        logger.error('Failed to cleanup session', {
          sessionId,
          error: getErrorMessage(error)
        });
        errors.push({ sessionId, error: getErrorMessage(error) });
      }
    }

    const result: CleanupResult = {
      cleanedSessions: sessionsToClean.length - errors.length,
      errors
    };

    logger.info('Session cleanup completed', result);

    return result;
  }

  /**
   * Start automatic cleanup job (runs every 5 minutes)
   */
  private startCleanupJob(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupInactiveSessions();
      } catch (error: unknown) {
        logger.error('Cleanup job error', { error: getErrorMessage(error) });
      }
    }, CONFIG.CLEANUP_INTERVAL_MS);

    logger.info('Cleanup job started', {
      interval: `${CONFIG.CLEANUP_INTERVAL_MS / 1000}s`,
      timeout: `${CONFIG.SESSION_TIMEOUT_MS / 1000}s`
    });
  }

  /**
   * Start heartbeat job (runs every 30 seconds)
   */
  private startHeartbeatJob(): void {
    this.heartbeatTimer = setInterval(() => {
      try {
        this.sendHeartbeats();
      } catch (error: unknown) {
        logger.error('Heartbeat job error', { error: getErrorMessage(error) });
      }
    }, CONFIG.HEARTBEAT_INTERVAL_MS);

    logger.info('Heartbeat job started', {
      interval: `${CONFIG.HEARTBEAT_INTERVAL_MS / 1000}s`
    });
  }

  /**
   * Get session statistics
   */
  getStats(): SessionStats {
    const sessions = Array.from(this.sessions.values());

    let totalCommands = 0;
    let connectedClients = 0;

    for (const session of sessions) {
      totalCommands += session.commandHistory.length;
    }

    for (const clients of this.sseClients.values()) {
      connectedClients += clients.length;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      idleSessions: sessions.filter(s => s.status === 'idle').length,
      destroyedSessions: sessions.filter(s => s.status === 'destroyed').length,
      totalCommands,
      connectedClients
    };
  }

  /**
   * Shutdown manager (cleanup all resources)
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down TerminalSessionManager');

    // Stop background jobs
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Destroy all sessions
    const sessionIds = Array.from(this.sessions.keys());
    for (const sessionId of sessionIds) {
      try {
        await this.destroySession(sessionId);
      } catch (_error) {
        // Ignore errors during shutdown
      }
    }

    logger.info('TerminalSessionManager shutdown complete');
  }
}

// Singleton export
export default new TerminalSessionManager();
