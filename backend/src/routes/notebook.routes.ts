import { Router } from 'express';
import {
  executeCell,
  getSessionInfo,
  getAllSessions,
  restartKernel,
  destroySession
} from '../controllers/notebook.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { ExecuteCellRequestSchema } from '../types/notebook.types';

const router = Router();

// Execute a code cell in a notebook
router.post(
  '/:noteId/execute',
  validateRequest(ExecuteCellRequestSchema),
  executeCell
);

// Get kernel session info for a specific notebook
router.get('/:noteId/session', getSessionInfo);

// Get all active kernel sessions
router.get('/sessions', getAllSessions);

// Restart kernel for a notebook
router.post('/:noteId/restart', restartKernel);

// Destroy kernel session
router.delete('/:noteId/session', destroySession);

export default router;
