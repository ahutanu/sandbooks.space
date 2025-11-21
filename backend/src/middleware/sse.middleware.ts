import { Request, Response, NextFunction } from 'express';
import { setupSSE } from '../utils/sse';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * SSE middleware - Setup Server-Sent Events headers
 * Must be applied before any SSE endpoint handlers
 */
export const sseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    setupSSE(res);

    logger.debug('SSE connection established', {
      path: req.path,
      ip: req.ip
    });

    next();
  } catch (_error: unknown) {
    logger.error('Failed to setup SSE connection', {
      error: getErrorMessage(_error),
      path: req.path
    });
    next(_error);
  }
};

/**
 * SSE keepalive helper
 * Sends periodic comments to keep connection alive
 */
export function startSSEKeepalive(
  res: Response,
  intervalMs: number = 30000
): NodeJS.Timeout {
  const timer = setInterval(() => {
    try {
      // Send comment (ignored by client, keeps connection alive)
      res.write(': keepalive\n\n');
    } catch (_error) {
      // Connection closed, stop keepalive
      clearInterval(timer);
    }
  }, intervalMs);

  // Cleanup on connection close
  res.on('close', () => {
    clearInterval(timer);
  });

  return timer;
}
