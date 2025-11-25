export type TerminalProvider = 'cloud';

export interface TerminalProviderInterface {
  readonly provider: TerminalProvider;
  readonly name: string;
  readonly mode: 'terminal';
  
  readonly isAvailable: () => Promise<boolean>;
  
  createSession: (options?: { cols: number; rows: number }) => Promise<{ sessionId: string }>;
  destroySession: (sessionId: string) => Promise<void>;
  
  // Unified input method (raw keystrokes)
  sendInput: (sessionId: string, data: string) => Promise<void>;
  
  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  
  connectStream: (sessionId: string) => EventSource | null;
  disconnectStream: (stream: EventSource | null) => void;
}
