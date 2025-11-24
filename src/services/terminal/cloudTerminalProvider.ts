import type { TerminalProviderInterface } from './types';
import { terminalService } from '../terminal';
import type { CreateSessionResponse } from '../../types/terminal';

/**
 * Cloud Terminal Provider
 * Wraps the existing terminal service to provide cloud-based terminal sessions
 */
export class CloudTerminalProvider implements TerminalProviderInterface {
  readonly provider = 'cloud' as const;
  readonly name = 'Cloud Terminal (Hopx)';
  readonly mode = 'repl' as const;

  async isAvailable(): Promise<boolean> {
    // Cloud terminal is available if backend is reachable
    return await terminalService.healthCheck();
  }

  async createSession(): Promise<{ sessionId: string }> {
    const response: CreateSessionResponse = await terminalService.createSession('global');
    // CreateSessionResponse has sessionId field
    return { sessionId: response.sessionId };
  }

  async destroySession(sessionId: string): Promise<void> {
    await terminalService.destroySession(sessionId);
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    // For REPL mode, data is the full command
    await terminalService.executeCommand(sessionId, data);
  }

  async resize(_sessionId: string, _cols: number, _rows: number): Promise<void> {
    // Cloud terminal doesn't support resize yet
    // Or it's handled automatically by the sandbox
  }

  connectStream(sessionId: string): EventSource | null {
    return terminalService.connectStream(sessionId);
  }

  disconnectStream(stream: EventSource | WebSocket | null): void {
    if (stream instanceof EventSource) {
      terminalService.disconnectStream(stream);
    } else if (stream instanceof WebSocket) {
      stream.close();
    }
  }
}

export const cloudTerminalProvider = new CloudTerminalProvider();
