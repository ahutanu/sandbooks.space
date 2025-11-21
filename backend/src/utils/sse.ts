import { Response } from 'express';
import logger from './logger';
import { getErrorMessage } from './errorUtils';

/**
 * SSE utilities for Server-Sent Events
 */

/**
 * Send SSE event to client
 * Format: event: {type}\ndata: {json}\n\n
 */
export function sendSSE(
  res: Response,
  eventType: string,
  data: unknown
): void {
  try {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(message);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error('Failed to send SSE event', {
      eventType,
      error: message
    });
    throw error;
  }
}

/**
 * Setup SSE response headers
 * Must be called before sending any events
 */
export function setupSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
}

/**
 * Send heartbeat to keep connection alive
 */
export function sendHeartbeat(res: Response): void {
  sendSSE(res, 'heartbeat', { timestamp: Date.now() });
}
