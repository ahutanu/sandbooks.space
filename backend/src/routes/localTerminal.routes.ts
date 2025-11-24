import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { handleWebSocketConnection } from '../controllers/localTerminal.controller';
import localTerminalService from '../services/localTerminal.service';
import logger from '../utils/logger';

/**
 * Local Terminal Routes
 * Base path: /api/terminal/local
 * 
 * WebSocket endpoint: /api/terminal/local/ws/:sessionId?
 */

const router = Router();

/**
 * Create WebSocket server for local terminal
 * This will be attached to the HTTP server in index.ts
 */
export const createLocalTerminalWebSocketServer = (server: import('http').Server): WebSocketServer => {
  const wss = new WebSocketServer({ 
    noServer: true
  });

  // Handle upgrade requests - this runs BEFORE Express middleware
  // WebSocket upgrades bypass Express, so we handle them directly at the HTTP server level
  server.on('upgrade', (request: IncomingMessage, socket: import('net').Socket, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith('/api/terminal/local/ws')) {
      const localEnabled = process.env.ENABLE_LOCAL_TERMINAL === 'true';
      if (!localEnabled) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // Require auth token except for trusted localhost dev
      const tokenFromHeader = request.headers['authorization']?.split(' ')[1];
      const tokenFromQuery = new URLSearchParams(new URL(request.url || '', `http://${request.headers.host}`).search).get('token');
      const token = tokenFromHeader || tokenFromQuery || undefined;
      const API_ACCESS_TOKEN = process.env.API_ACCESS_TOKEN;
      const isLocalhost = request.headers.host?.startsWith('localhost') || request.headers.host?.startsWith('127.0.0.1');
      const isDev = process.env.NODE_ENV === 'development';

      const tokenRequired = API_ACCESS_TOKEN || !isDev || !isLocalhost;
      if (tokenRequired && (!token || token !== API_ACCESS_TOKEN)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Handle WebSocket upgrade - bypasses Express auth middleware
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        // Extract sessionId from pathname if present
        const match = pathname.match(/\/api\/terminal\/local\/ws(?:\/([^/]+))?/);
        const sessionId = match?.[1];
        
        handleWebSocketConnection(ws, request, sessionId).catch((error) => {
          logger.error('WebSocket connection error', { error });
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1011, 'Internal server error');
          }
        });
      });
      return; // Handled, don't let other handlers process
    }
    // If not a local terminal WebSocket, let other handlers process it (e.g., other WebSocket servers)
    // Don't destroy - other handlers might want to process it
  });

  logger.info('Local terminal WebSocket server created');
  
  return wss;
};

/**
 * REST endpoints for local terminal (optional - for session management)
 */

/**
 * GET /api/terminal/local/health
 * Health check for local terminal availability
 */
router.get('/health', (req, res) => {
  res.json({
    available: true,
    platform: process.platform,
    shell: process.env.SHELL || 'default'
  });
});

/**
 * GET /api/terminal/local/sessions/:sessionId/health
 * Check if a specific session exists and is healthy
 */
router.get('/sessions/:sessionId/health', (req, res) => {
  const { sessionId } = req.params;
  const session = localTerminalService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({
      exists: false,
      message: 'Session not found'
    });
  }

  res.json({
    exists: true,
    sessionId,
    shell: session.shell,
    workingDir: session.workingDir,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt
  });
});

export default router;
