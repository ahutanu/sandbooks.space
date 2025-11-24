export type TerminalProvider = 'cloud' | 'local';

export interface TerminalProviderInterface {
  readonly provider: TerminalProvider;
  readonly name: string;

  // 'pty' means the provider expects raw keystrokes and handles echo/history (real terminal - local)
  // 'terminal' means the provider uses WebSocket PTY with persistent state (cloud)
  // 'repl' means the provider expects full command lines and the frontend handles echo/history (legacy)
  readonly mode: 'pty' | 'terminal' | 'repl';
  
  readonly isAvailable: () => Promise<boolean>;
  
  createSession: (options?: { cols: number; rows: number }) => Promise<{ sessionId: string }>;
  destroySession: (sessionId: string) => Promise<void>;
  
  // Unified input method
  // For 'pty': data is raw keystrokes
  // For 'repl': data is the full command line
  sendInput: (sessionId: string, data: string) => Promise<void>;
  
  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  
  connectStream: (sessionId: string) => EventSource | WebSocket | null;
  disconnectStream: (stream: EventSource | WebSocket | null) => void;
}
