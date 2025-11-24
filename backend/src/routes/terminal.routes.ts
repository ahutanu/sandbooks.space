import { Router } from 'express';
import {
  createSession,
  getSession,
  destroySession,
  sendInput,
  executeCommand,
  streamOutput,
  resizeTerminal,
  getStats,
  manualCleanup
} from '../controllers/terminal.controller';

const router = Router();

/**
 * Terminal Routes
 * Base path: /api/terminal
 */

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * POST /api/terminal/sessions
 * Create a new terminal session
 */
router.post('/sessions', createSession);

/**
 * GET /api/terminal/sessions/:sessionId
 * Get session details
 */
router.get('/sessions/:sessionId', getSession);

/**
 * DELETE /api/terminal/sessions/:sessionId
 * Destroy a terminal session
 */
router.delete('/sessions/:sessionId', destroySession);

// ============================================================================
// TERMINAL INPUT/OUTPUT
// ============================================================================

/**
 * POST /api/terminal/:sessionId/input
 * Send input to terminal session (preferred method)
 */
router.post('/:sessionId/input', sendInput);

/**
 * POST /api/terminal/:sessionId/execute
 * DEPRECATED: Execute a command (backward compatibility only)
 */
router.post('/:sessionId/execute', executeCommand);

/**
 * GET /api/terminal/:sessionId/stream
 * Stream command output via Server-Sent Events (SSE)
 * Headers are set directly in controller (no middleware needed)
 */
router.get('/:sessionId/stream', streamOutput);

/**
 * POST /api/terminal/:sessionId/resize
 * Resize terminal dimensions
 */
router.post('/:sessionId/resize', resizeTerminal);

// ============================================================================
// ADMIN/DEBUG ENDPOINTS
// ============================================================================

/**
 * GET /api/terminal/stats
 * Get terminal session statistics
 */
router.get('/stats', getStats);

/**
 * POST /api/terminal/cleanup
 * Manually trigger session cleanup
 */
router.post('/cleanup', manualCleanup);

export default router;
