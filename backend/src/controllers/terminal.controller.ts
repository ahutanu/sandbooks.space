import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import terminalSessionManager from '../services/terminalSessionManager';
import {
  CreateSessionRequestSchema,
  ExecuteCommandRequestSchema,
  CreateSessionResponse,
  GetSessionResponse,
  ExecuteCommandResponse,
  SessionNotFoundError,
  SessionDestroyedError,
  CommandExecutionError
} from '../types/terminal.types';
import logger from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Terminal Controller
 * Handles HTTP requests for terminal session management and command execution
 */

/**
 * POST /api/terminal/sessions
 * Create a new terminal session
 */
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request
    const parsed = CreateSessionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    logger.info('Creating terminal session', {
      metadata: parsed.data.metadata,
      ip: req.ip
    });

    // Create session
    const session = await terminalSessionManager.createSession();

    // Prepare response
    const response: CreateSessionResponse = {
      sessionId: session.sessionId,
      sandboxId: session.sandboxId,
      status: session.status,
      createdAt: session.createdAt,
      expiresIn: 30 * 60 * 1000 // 30 minutes
    };

    logger.info('Terminal session created', {
      sessionId: session.sessionId,
      sandboxId: session.sandboxId
    });

    res.status(201).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/terminal/sessions/:sessionId
 * Get session details
 */
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.debug('Getting session details', { sessionId });

    // Get session
    const session = terminalSessionManager.getSession(sessionId);

    // Prepare response
    const response: GetSessionResponse = {
      sessionId: session.sessionId,
      sandboxId: session.sandboxId,
      status: session.status,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      commandHistory: session.commandHistory,
      uptime: Date.now() - session.createdAt
    };

    res.status(200).json(response);

  } catch (error) {
    if (error instanceof SessionNotFoundError || error instanceof SessionDestroyedError) {
      next(error);
    } else {
      next(error);
    }
  }
};

/**
 * DELETE /api/terminal/sessions/:sessionId
 * Destroy a terminal session
 */
export const destroySession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('Destroying terminal session', { sessionId });

    // Destroy session
    await terminalSessionManager.destroySession(sessionId);

    res.status(200).json({
      message: 'Session destroyed successfully',
      sessionId
    });

  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      next(error);
    } else {
      next(error);
    }
  }
};

/**
 * POST /api/terminal/:sessionId/input
 * Send input to terminal session
 */
export const sendInput = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { data } = req.body;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!data || typeof data !== 'string') {
      throw new ValidationError('Input data is required and must be a string');
    }

    logger.debug('Sending input to terminal session', {
      sessionId,
      dataLength: data.length
    });

    await terminalSessionManager.sendInput(sessionId, data);

    res.status(200).json({ status: 'sent' });

  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof SessionDestroyedError ||
      error instanceof CommandExecutionError
    ) {
      next(error);
    } else {
      next(error);
    }
  }
};

/**
 * POST /api/terminal/:sessionId/execute
 * DEPRECATED: Legacy endpoint for backward compatibility
 */
export const executeCommand = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const parsed = ExecuteCommandRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const request = parsed.data;

    logger.info('DEPRECATED: executeCommand called, redirecting to sendInput', {
      sessionId,
      commandLength: request.command.length
    });

    await terminalSessionManager.sendInput(sessionId, request.command + '\n');

    const response: ExecuteCommandResponse = {
      commandId: randomUUID(),
      status: 'started',
      message: 'Command sent to terminal'
    };

    res.status(202).json(response);

  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof SessionDestroyedError ||
      error instanceof CommandExecutionError
    ) {
      next(error);
    } else {
      next(error);
    }
  }
};

/**
 * GET /api/terminal/:sessionId/stream
 * Stream command output via Server-Sent Events (SSE)
 */
export const streamOutput = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    logger.info('SSE client connecting', {
      sessionId,
      ip: req.ip
    });

    // CRITICAL: Set SSE headers BEFORE registering client
    // These headers tell the browser this is an SSE connection, not a regular HTTP response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable proxy buffering
    });

    // Register SSE client
    const client = terminalSessionManager.registerSSEClient(sessionId, res);

    logger.info('SSE client registered', {
      sessionId,
      clientId: client.clientId
    });

    // Keep connection open - DO NOT END RESPONSE
    // Connection stays alive until:
    // 1. Client closes (handled by response.on('close') in registerSSEClient)
    // 2. Session destroyed
    // 3. Error occurs

    // This function intentionally doesn't return - connection stays open
    await new Promise(() => {
      // Never resolves - keeps connection alive indefinitely
    });

  } catch (error) {
    // Log the error for debugging
    logger.warn('SSE connection failed', {
      sessionId: req.params.sessionId,
      errorType: error instanceof SessionNotFoundError ? 'SessionNotFound' :
                 error instanceof SessionDestroyedError ? 'SessionDestroyed' :
                 'Unknown',
      message: getErrorMessage(error)
    });

    if (
      error instanceof SessionNotFoundError ||
      error instanceof SessionDestroyedError
    ) {
      // Try to send error as SSE event before closing (if headers not sent yet)
      try {
        if (!res.headersSent) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
          });
        }
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      } catch {
        // Ignore write errors
      }
      res.end();
    } else {
      next(error);
    }
  }
};

/**
 * POST /api/terminal/:sessionId/resize
 * Resize terminal dimensions
 */
export const resizeTerminal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { cols, rows } = req.body;

    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    if (!cols || !rows || cols < 20 || rows < 10) {
      throw new ValidationError('Invalid terminal dimensions (minimum 20x10)');
    }

    logger.debug('Resizing terminal', { sessionId, cols, rows });

    await terminalSessionManager.resize(sessionId, cols, rows);

    res.status(200).json({ message: 'Terminal resized', cols, rows });

  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof SessionDestroyedError ||
      error instanceof CommandExecutionError
    ) {
      next(error);
    } else {
      next(error);
    }
  }
};

/**
 * GET /api/terminal/stats
 * Get terminal session statistics (admin/debug endpoint)
 */
export const getStats = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const stats = terminalSessionManager.getStats();

    logger.debug('Terminal stats requested', stats);

    res.status(200).json(stats);

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/terminal/cleanup
 * Manually trigger session cleanup (admin endpoint)
 */
export const manualCleanup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info('Manual cleanup triggered');

    const result = await terminalSessionManager.cleanupInactiveSessions();

    res.status(200).json({
      message: 'Cleanup completed',
      ...result
    });

  } catch (error) {
    next(error);
  }
};
