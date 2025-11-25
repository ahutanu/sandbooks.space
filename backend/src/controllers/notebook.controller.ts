import { Request, Response, NextFunction } from 'express';
import notebookKernelService from '../services/notebookKernelService';
import { ExecuteCellRequest } from '../types/notebook.types';
import logger from '../utils/logger';

/**
 * Execute a code cell in a notebook
 * POST /api/notebooks/:noteId/execute
 */
export const executeCell = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { noteId } = req.params;
    const { code } = req.body as ExecuteCellRequest;

    logger.info('Received execute cell request', { noteId, codeLength: code.length });

    const result = await notebookKernelService.executeCell(noteId, code);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get kernel session info for a notebook
 * GET /api/notebooks/:noteId/session
 */
export const getSessionInfo = (req: Request, res: Response) => {
  const { noteId } = req.params;

  logger.debug('Getting session info', { noteId });

  const session = notebookKernelService.getSessionInfo(noteId);

  if (!session) {
    res.status(404).json({
      message: 'No kernel session found',
      noteId
    });
    return;
  }

  res.status(200).json(session);
};

/**
 * Get all active kernel sessions
 * GET /api/notebooks/sessions
 */
export const getAllSessions = (req: Request, res: Response) => {
  logger.debug('Getting all sessions');

  const sessions = notebookKernelService.getAllSessionsInfo();

  res.status(200).json({
    sessions,
    count: sessions.length
  });
};

/**
 * Restart kernel for a notebook (clear execution count, keep sandbox)
 * POST /api/notebooks/:noteId/restart
 */
export const restartKernel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { noteId } = req.params;

    logger.info('Received restart kernel request', { noteId });

    await notebookKernelService.restartKernel(noteId);

    res.status(200).json({
      message: 'Kernel restarted',
      noteId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Destroy kernel session for a notebook
 * DELETE /api/notebooks/:noteId/session
 */
export const destroySession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { noteId } = req.params;

    logger.info('Received destroy session request', { noteId });

    await notebookKernelService.destroySession(noteId);

    res.status(200).json({
      message: 'Session destroyed',
      noteId
    });
  } catch (error) {
    next(error);
  }
};
