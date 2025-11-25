export type TerminalProvider = 'cloud';

export interface TerminalProviderInterface {
  readonly provider: TerminalProvider;
  readonly name: string;

  // Cloud terminal uses WebSocket PTY with raw keystroke streaming
  // Backend handles echo, line editing, command history, and tab completion
  readonly mode: 'terminal';

  readonly isAvailable: () => Promise<boolean>;

  createSession: (options?: { cols: number; rows: number }) => Promise<{ sessionId: string }>;
  destroySession: (sessionId: string) => Promise<void>;

  // Send raw input (keystrokes) to the terminal
  sendInput: (sessionId: string, data: string) => Promise<void>;

  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;

  connectStream: (sessionId: string) => EventSource | WebSocket | null;
  disconnectStream: (stream: EventSource | WebSocket | null) => void;
}
