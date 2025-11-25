import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { requestLogger } from './middleware/logging.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import executeRoutes from './routes/execute.routes';
import sandboxRoutes from './routes/sandbox.routes';
import terminalRoutes from './routes/terminal.routes';
import notebookRoutes from './routes/notebook.routes';
import githubRoutes from './routes/github.routes';
import githubService from './services/github.service';
import env from './config/env';
import { authGuard } from './middleware/auth.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import logger from './utils/logger';

const createApp = (): Application => {
  const app = express();

  // Respect proxy headers for rate limiting / IP detection (Azure, Render, etc.)
  app.set('trust proxy', 1);

  // Security headers then CORS
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors(corsOptions));

  // Body parsing with security limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Rate limiting and optional token guard
  app.use(apiRateLimiter);
  app.use(authGuard);

  // Request logging
  app.use(requestLogger);

  // Initialize GitHub service with env vars (if configured)
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    githubService.initialize(
      env.GITHUB_CLIENT_ID,
      env.GITHUB_CLIENT_SECRET,
      env.GITHUB_OAUTH_CALLBACK_URL || 'http://localhost:5173/github/callback'
    );
  }

  // Routes
  app.use('/api', executeRoutes);
  app.use('/api/sandbox', sandboxRoutes);
  app.use('/api/terminal', terminalRoutes);
  app.use('/api/notebooks', notebookRoutes);
  app.use('/api/github', githubRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Sandbooks Backend API',
      version: '1.0.0',
      status: 'running'
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app configured');

  return app;
};

export default createApp;
