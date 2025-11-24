/**
 * Terminal Service
 *
 * API client for terminal session management and SSE streaming.
 */

import type {
  CreateSessionResponse,
  DestroySessionResponse,
  ExecuteCommandResponse,
  ErrorResponse,
} from '../types/terminal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

const authHeaders: Record<string, string> = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
const jsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  ...authHeaders
};

class TerminalService {
  /**
   * Create a new terminal session for a note
   */
  async createSession(noteId: string): Promise<CreateSessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/sessions`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ noteId }),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create terminal session: ${error.message}`);
      }
      throw new Error('Failed to create terminal session: Unknown error');
    }
  }

  /**
   * Destroy a terminal session
   */
  async destroySession(sessionId: string): Promise<DestroySessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: jsonHeaders,
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to destroy terminal session: ${error.message}`);
      }
      throw new Error('Failed to destroy terminal session: Unknown error');
    }
  }

  /**
   * Send input to terminal session (preferred method)
   */
  async sendInput(sessionId: string, data: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/${sessionId}/input`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send input: ${error.message}`);
      }
      throw new Error('Failed to send input: Unknown error');
    }
  }

  /**
   * Execute a command in a terminal session
   * DEPRECATED: Use sendInput() instead
   */
  async executeCommand(
    sessionId: string,
    command: string
  ): Promise<ExecuteCommandResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/${sessionId}/execute`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to execute command: ${error.message}`);
      }
      throw new Error('Failed to execute command: Unknown error');
    }
  }

  /**
   * Connect to SSE stream for a terminal session
   *
   * Returns an EventSource that emits:
   * - 'stdout': Standard output data
   * - 'stderr': Standard error data
   * - 'exit': Process exit with code
   * - 'error': Error message
   * - 'ping': Heartbeat to keep connection alive
   */
  connectStream(sessionId: string): EventSource {
    console.log('[TerminalService] connectStream called with sessionId:', sessionId);
    const tokenParam = API_TOKEN ? `?token=${encodeURIComponent(API_TOKEN)}` : '';
    const url = `${API_BASE_URL}/api/terminal/${sessionId}/stream${tokenParam}`;
    console.log('[TerminalService] Creating EventSource with URL:', url);
    const eventSource = new EventSource(url);
    console.log('[TerminalService] EventSource created, readyState:', eventSource.readyState);

    // Log connection errors for debugging
    eventSource.onerror = (error) => {
      console.error('[TerminalService] SSE connection error:', error, 'readyState:', eventSource.readyState);
    };

    eventSource.onopen = () => {
      console.log('[TerminalService] SSE connection opened successfully');
    };

    return eventSource;
  }

  /**
   * Close an EventSource connection
   */
  disconnectStream(eventSource: EventSource): void {
    try {
      eventSource.close();
    } catch (error) {
      console.error('[TerminalService] Error closing EventSource:', error);
    }
  }

  /**
   * Resize the terminal
   */
  async resize(
    sessionId: string,
    cols: number,
    rows: number
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/${sessionId}/resize`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ cols, rows }),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to resize terminal: ${error.message}`);
      }
      throw new Error('Failed to resize terminal: Unknown error');
    }
  }

  /**
   * DEPRECATED: Use resize() instead
   */
  async resizeTerminal(
    sessionId: string,
    cols: number,
    rows: number
  ): Promise<void> {
    return this.resize(sessionId, cols, rows);
  }

  /**
   * Health check - test connection to backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: authHeaders,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const terminalService = new TerminalService();
