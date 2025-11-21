import { z } from 'zod';
import { Response } from 'express';

// ============================================================================
// SESSION TYPES
// ============================================================================

/**
 * Terminal session state
 */
export type SessionStatus = 'active' | 'idle' | 'destroyed';

/**
 * Terminal session interface
 * Represents a persistent terminal session backed by a shared Hopx sandbox
 */
export interface TerminalSession {
  sessionId: string;
  sandboxId: string;
  status: SessionStatus;
  createdAt: number;
  lastActivityAt: number;
  commandHistory: CommandHistoryEntry[];
}

/**
 * Command history entry
 */
export interface CommandHistoryEntry {
  commandId: string;
  command: string;
  timestamp: number;
  exitCode?: number;
  duration?: number;
}

// ============================================================================
// SSE CLIENT TYPES
// ============================================================================

/**
 * SSE client connection
 */
export interface SSEClient {
  clientId: string;
  sessionId: string;
  response: Response;
  connectedAt: number;
  lastHeartbeat: number;
}

/**
 * SSE event types
 */
export type SSEEventType =
  | 'connected'
  | 'output'
  | 'error'
  | 'complete'
  | 'heartbeat'
  | 'session_destroyed';

/**
 * SSE event data
 */
export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp?: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create session request schema
 */
export const CreateSessionRequestSchema = z.object({
  metadata: z.object({
    userId: z.string().optional(),
    noteId: z.string().optional()
  }).optional()
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

/**
 * Execute command request schema
 */
export const ExecuteCommandRequestSchema = z.object({
  command: z.string().min(1, 'Command cannot be empty').max(10000, 'Command too long'),
  language: z.enum(['bash', 'python', 'javascript', 'typescript', 'go']).default('bash'),
  workingDirectory: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional() // 1s - 5min
});

export type ExecuteCommandRequest = z.infer<typeof ExecuteCommandRequestSchema>;

/**
 * Create session response
 */
export interface CreateSessionResponse {
  sessionId: string;
  sandboxId: string;
  status: SessionStatus;
  createdAt: number;
  expiresIn: number; // milliseconds until auto-cleanup
}

/**
 * Get session response
 */
export interface GetSessionResponse {
  sessionId: string;
  sandboxId: string;
  status: SessionStatus;
  createdAt: number;
  lastActivityAt: number;
  commandHistory: CommandHistoryEntry[];
  uptime: number; // milliseconds since creation
}

/**
 * Execute command response
 */
export interface ExecuteCommandResponse {
  commandId: string;
  status: 'started' | 'completed' | 'failed';
  message: string;
}

/**
 * Command output (streamed via SSE)
 */
export interface CommandOutput {
  commandId: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime?: number;
  error?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Base terminal error class
 */
export class TerminalError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'TerminalError';
    Object.setPrototypeOf(this, TerminalError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends TerminalError {
  constructor(sessionId: string) {
    super(404, `Terminal session '${sessionId}' not found`);
    this.name = 'SessionNotFoundError';
    Object.setPrototypeOf(this, SessionNotFoundError.prototype);
  }
}

/**
 * Session already destroyed error
 */
export class SessionDestroyedError extends TerminalError {
  constructor(sessionId: string) {
    super(410, `Terminal session '${sessionId}' has been destroyed`);
    this.name = 'SessionDestroyedError';
    Object.setPrototypeOf(this, SessionDestroyedError.prototype);
  }
}

/**
 * Command execution error
 */
export class CommandExecutionError extends TerminalError {
  constructor(message: string, statusCode = 500) {
    super(statusCode, `Command execution failed: ${message}`);
    this.name = 'CommandExecutionError';
    Object.setPrototypeOf(this, CommandExecutionError.prototype);
  }
}

/**
 * SSE connection error
 */
export class SSEConnectionError extends TerminalError {
  constructor(message: string) {
    super(500, `SSE connection error: ${message}`);
    this.name = 'SSEConnectionError';
    Object.setPrototypeOf(this, SSEConnectionError.prototype);
  }
}

// ============================================================================
// SESSION MANAGER TYPES
// ============================================================================

/**
 * Session cleanup result
 */
export interface CleanupResult {
  cleanedSessions: number;
  errors: Array<{ sessionId: string; error: string }>;
}

/**
 * Session statistics
 */
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  destroyedSessions: number;
  totalCommands: number;
  connectedClients: number;
}
