import rateLimit from 'express-rate-limit';
import env from '../config/env';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (env.NODE_ENV === 'development') return true;
    if (req.method === 'OPTIONS') return true;
    const path = req.path.toLowerCase();
    if (path.startsWith('/api/health') || path.includes('/sandbox/health')) return true;
    if (path.includes('/terminal/stream')) return true;
    return false;
  }
});
