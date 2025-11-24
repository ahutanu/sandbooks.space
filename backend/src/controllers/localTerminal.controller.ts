import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import localTerminalService from '../services/localTerminal.service';
import logger from '../utils/logger';

/**
 * Local Terminal Controller
 * Handles WebSocket connections for local terminal sessions
 */

export const handleWebSocketConnection = async (
  ws: WebSocket,
  request: IncomingMessage,
  sessionId?: string
): Promise<void> => {
  const requestedSessionId = sessionId;
  
  // Get or create session
  let session = requestedSessionId 
    ? localTerminalService.getSession(requestedSessionId)
    : null;
  
  let actualSessionId: string;
  
  if (!session) {
    // Create new session (requested sessionId doesn't exist or wasn't provided)
    try {
      const newSession = await localTerminalService.createSession();
      session = localTerminalService.getSession(newSession.sessionId);
      
      if (!session) {
        ws.close(1011, 'Failed to create session');
        return;
      }
      
      // Use the newly created session's ID
      actualSessionId = newSession.sessionId;
      
      logger.info('Created new terminal session for WebSocket', {
        requestedSessionId: requestedSessionId || 'none',
        actualSessionId
      });
    } catch (error) {
      logger.error('Failed to create terminal session', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      ws.close(1011, 'Failed to create session');
      return;
    }
  } else {
    // Use existing session
    actualSessionId = requestedSessionId!;
    
    logger.info('Reconnected to existing terminal session', {
      sessionId: actualSessionId
    });
  }
  
  // Set up data handler for PTY output (use actualSessionId)
  const dataHandler = (sid: string, data: string) => {
    if (sid === actualSessionId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  };
  
  // Set up exit handler (use actualSessionId)
  const exitHandler = (sid: string, exitCode: number, signal?: number) => {
    if (sid === actualSessionId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
    }
  };
  
  localTerminalService.on('data', dataHandler);
  localTerminalService.on('exit', exitHandler);

  // Heartbeat / ping-pong
  const heartbeat = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  };
  const heartbeatTimer = setInterval(heartbeat, 15000);
  ws.on('pong', () => {
    // No-op: lower-level keepalive. App-level latency handled via messages.
  });
  
  // Handle incoming messages (user input - use actualSessionId)
  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'input') {
        // User keystrokes/input
        localTerminalService.writeToSession(actualSessionId, data.data);
      } else if (data.type === 'resize') {
        // Terminal resize
        localTerminalService.resizeSession(
          actualSessionId,
          data.cols,
          data.rows
        );
      } else if (data.type === 'ping') {
        // Application-level latency measurement
        ws.send(JSON.stringify({ type: 'pong', ts: data.ts }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    localTerminalService.removeListener('data', dataHandler);
    localTerminalService.removeListener('exit', exitHandler);
    clearInterval(heartbeatTimer);
    logger.info('WebSocket connection closed', { sessionId: actualSessionId });
  });

  // Send initial connection confirmation with actual session ID
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: actualSessionId,
    shell: session.shell,
    workingDir: session.workingDir
  }));
  
  logger.info('WebSocket connection established', { 
    sessionId: actualSessionId,
    requestedSessionId: requestedSessionId || 'none'
  });
};
