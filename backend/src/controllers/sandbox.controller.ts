import { Request, Response, NextFunction } from 'express';
import hopxService from '../services/hopx.service';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * POST /api/sandbox/recreate
 * Force recreate sandbox (destroy old + create new)
 * Used when: Toggle enabled/disabled, manual restart
 */
export const recreateSandbox = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Recreate sandbox request received');

    const result = await hopxService.forceRecreateSandbox();

    logger.info('Sandbox recreated successfully', { sandboxId: result.sandboxId });

    res.status(200).json({
      success: true,
      sandboxId: result.sandboxId,
      message: 'Sandbox recreated successfully'
    });
  } catch (error: unknown) {
    logger.error('Failed to recreate sandbox', { error: getErrorMessage(error) });
    next(error);
  }
};

/**
 * GET /api/sandbox/health
 * Get current sandbox health status
 * Returns: status, features, uptime, metrics
 */
export const getHealth = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const health = await hopxService.getHealth();

    res.status(200).json({
      success: true,
      health
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error('Health check failed', { error: message });
    // Don't fail the request - return unhealthy status
    res.status(200).json({
      success: false,
      health: {
        status: 'unknown',
        isHealthy: false,
        error: message
      }
    });
  }
};

/**
 * GET /api/sandbox/status
 * Get sandbox info (ID, status, resources)
 */
export const getSandboxStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const info = await hopxService.getSandboxInfo();

    res.status(200).json({
      success: true,
      sandbox: info
    });
  } catch (error: unknown) {
    logger.error('Failed to get sandbox status', { error: getErrorMessage(error) });
    next(error);
  }
};

/**
 * POST /api/sandbox/destroy
 * Destroy current sandbox (cleanup)
 * Used when: Toggle disabled
 */
export const destroySandbox = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info('Destroy sandbox request received');

    await hopxService.destroySandbox();

    logger.info('Sandbox destroyed successfully');

    res.status(200).json({
      success: true,
      message: 'Sandbox destroyed successfully'
    });
  } catch (error: unknown) {
    logger.error('Failed to destroy sandbox', { error: getErrorMessage(error) });
    next(error);
  }
};
