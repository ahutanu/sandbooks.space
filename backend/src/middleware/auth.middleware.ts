import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

/**
 * Optional token-based guard for public endpoints.
 * When API_ACCESS_TOKEN is set, clients must present it via:
 * - Header: `x-sandbooks-token: <token>` or
 * - Authorization: `Bearer <token>`
 */
export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  // Always allow preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  // WebSocket upgrade requests are handled separately at the HTTP server level
  // They should not reach Express middleware, but if they do, allow them through
  if (req.headers.upgrade === 'websocket') {
    return next();
  }

  // Public health endpoints should never require auth
  const path = req.path.toLowerCase();
  if (path.startsWith('/api/health') || path.includes('/sandbox/health') || path === '/') {
    return next();
  }

  // Fall back to open access if no token configured
  if (!env.API_ACCESS_TOKEN) {
    return next();
  }

  const bearerHeader = typeof req.headers.authorization === 'string'
    ? req.headers.authorization
    : undefined;
  const tokenHeader = req.headers['x-sandbooks-token'];
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

  const providedToken = bearerHeader?.startsWith('Bearer ')
    ? bearerHeader.slice(7)
    : Array.isArray(tokenHeader)
      ? tokenHeader[0]
      : tokenHeader || queryToken;

  if (providedToken !== env.API_ACCESS_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing API token' });
  }

  return next();
};
