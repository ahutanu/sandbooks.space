import type { TerminalProviderInterface } from './types';
import { isMobile } from '../../utils/platform';

/**
 * Local Terminal Provider
 * Provides local system terminal via WebSocket connection to backend
 * This is a stub implementation - full implementation will be completed in Phase 2
 */
export class LocalTerminalProvider implements TerminalProviderInterface {
  readonly provider = 'local' as const;
  readonly name = 'Local Terminal';
  readonly mode = 'pty' as const;
  
  private ws: WebSocket | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentReconnectPromise: Promise<{ sessionId: string }> | null = null;
  private resolveConnect: ((value: { sessionId: string }) => void) | null = null;
  private rejectConnect: ((reason?: unknown) => void) | null = null;
  private sessionId: string | null = null;
  
  async isAvailable(): Promise<boolean> {
    // Local terminal not available on mobile
    if (isMobile()) {
      return false;
    }

    // Check if we're in a browser environment with WebSocket support
    if (typeof window === 'undefined' || !window.WebSocket) {
      return false;
    }

    return true;
  }

  /**
   * Check if a session exists and is healthy
   */
  private async checkSessionHealth(sessionId: string): Promise<boolean> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/api/terminal/local/sessions/${sessionId}/health`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return data.exists === true;
    } catch {
      return false;
    }
  }
  
  async createSession(options?: { cols: number; rows: number }): Promise<{ sessionId: string }> {
    if (!(await this.isAvailable())) {
      throw new Error('Local terminal is not available');
    }

    // If there's already a reconnection in progress, return that promise
    if (this.currentReconnectPromise) {
      return this.currentReconnectPromise;
    }

    // Create new promise for this connection attempt
    this.currentReconnectPromise = new Promise((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
      this.connectWebSocket(options, this.sessionId ?? undefined);
    });

    const result = await this.currentReconnectPromise;
    return result;
  }
  
  private async connectWebSocket(options?: { cols: number; rows: number }, existingSessionId?: string): Promise<void> {
    // If reconnecting to an existing session, check if it's still valid
    if (existingSessionId) {
      const isHealthy = await this.checkSessionHealth(existingSessionId);
      if (!isHealthy) {
        // Session is stale, clear it and create new one
        this.sessionId = null;
        existingSessionId = undefined;
      }
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const sessionPath = existingSessionId ? `/api/terminal/local/ws/${existingSessionId}` : '/api/terminal/local/ws';
    const token = import.meta.env.VITE_API_TOKEN ? `?token=${import.meta.env.VITE_API_TOKEN}` : '';
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + sessionPath + token;
    
    // Clean up any existing connection before creating new one
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    
    const ws = new WebSocket(wsUrl);
    this.ws = ws; // Assign immediately so it's available for streams
    
    ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Send initial resize if options provided
      if (options) {
        this.resize('', options.cols, options.rows);
      }
    };
    
    // Use addEventListener so it doesn't conflict with TerminalEmulator's handler
    this.messageHandler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'connected') {
          this.sessionId = message.sessionId;
          // Session ID is stored in the resolved promise value
          if (this.resolveConnect) {
            this.resolveConnect({ sessionId: message.sessionId });
            this.resolveConnect = null;
            this.rejectConnect = null;
            this.currentReconnectPromise = null;
          }
          // Note: The 'connected' message will also be handled by TerminalEmulator's onmessage handler
        }
        // All other messages (output, exit) will be handled by TerminalEmulator's onmessage handler
      } catch (_error) {
        // Error parsing message, let TerminalEmulator handle display
      }
    };
    ws.addEventListener('message', this.messageHandler);
    
    ws.onerror = () => {
      if (this.rejectConnect) {
        this.rejectConnect(new Error('Failed to create local terminal session'));
        this.resolveConnect = null;
        this.rejectConnect = null;
        this.currentReconnectPromise = null;
      }
    };
    
    ws.onclose = () => {
      this.ws = null; // Clear reference to closed WebSocket

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(async () => {
          await this.connectWebSocket(options, this.sessionId ?? undefined); // Re-attempt connection with same session
        }, 1000 * this.reconnectAttempts);
      } else {
        if (this.rejectConnect) {
          this.rejectConnect(new Error('Failed to connect after multiple attempts'));
          this.resolveConnect = null;
          this.rejectConnect = null;
          this.currentReconnectPromise = null;
        }
      }
    };
  }
  
  async destroySession(_sessionId: string): Promise<void> {
    if (this.ws) {
      if (this.messageHandler) {
        this.ws.removeEventListener('message', this.messageHandler);
        this.messageHandler = null;
      }
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.currentReconnectPromise = null;
    this.resolveConnect = null;
    this.rejectConnect = null;
  }
  
  async sendInput(_sessionId: string, data: string): Promise<void> {
    // Commands are sent directly via WebSocket input
    this.sendMessage({ type: 'input', data: data });
  }
  
  async resize(_sessionId: string, cols: number, rows: number): Promise<void> {
    this.sendMessage({ type: 'resize', cols, rows });
  }

  connectStream(_sessionId: string): WebSocket | null {
    // WebSocket is already connected via createSession, return it
    // If WebSocket exists and is open, return it
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }
    // If WebSocket exists but not open yet, return it anyway (will be handled by onopen)
    if (this.ws) {
      return this.ws;
    }
    // No WebSocket yet - this shouldn't happen if createSession was called first
    return null;
  }

  disconnectStream(_stream: EventSource | WebSocket | null): void {
    // Do NOT close the WebSocket here.
    // disconnectStream is called when the TerminalEmulator component unmounts (e.g. toggling terminal view),
    // but we want the underlying session and connection to persist so the user can resume their session.
    // The WebSocket should only be closed when destroySession() is called.
  }
  
  private sendMessage(message: { type: 'input' | 'resize' | 'ping'; data?: string; cols?: number; rows?: number; ts?: number }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const localTerminalProvider = new LocalTerminalProvider();
