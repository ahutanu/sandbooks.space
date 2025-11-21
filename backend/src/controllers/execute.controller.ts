import { Request, Response, NextFunction } from 'express';
import hopxService from '../services/hopx.service';
import { ExecuteRequest } from '../types/execute.types';
import logger from '../utils/logger';

export const executeCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { code, language } = req.body as ExecuteRequest;

    logger.info('Received execution request', { language });

    const result = await hopxService.executeCode(code, language);

    // Include sandbox status in response
    res.status(200).json({
      ...result,
      sandboxStatus: 'healthy', // Execution succeeded, sandbox is healthy
      recoverable: true
    });
  } catch (error) {
    next(error);
  }
};

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sandbooks-backend'
  });
};
