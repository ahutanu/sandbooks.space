import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { TerminalError } from '../types/terminal.types';
import logger from '../utils/logger';
import env from '../config/env';

export const errorHandler = (
  error: Error | AppError | TerminalError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path
  });

  // Handle TerminalError (includes SessionNotFoundError, etc.)
  if (error instanceof TerminalError) {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode
    });
  }

  // Handle AppError (ValidationError, HopxError, etc.)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      sandboxStatus: 'unhealthy',
      recoverable: true
    });
  }

  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  res.status(500).json({
    error: message,
    statusCode: 500,
    sandboxStatus: 'unhealthy',
    recoverable: true
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
};
