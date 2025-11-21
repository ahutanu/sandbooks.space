/**
 * Terminal Types
 *
 * Frontend type definitions for the Quake-style terminal feature.
 */

// Terminal session state
export interface TerminalSessionState {
  sessionId: string;
  noteId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  eventSource: EventSource | null;
  createdAt: number;
  lastActivityAt: number;
  latency?: number; // Round-trip time in ms
  errorMessage?: string;
}

// SSE event types from backend
export type SSEEventType = 'stdout' | 'stderr' | 'exit' | 'error' | 'ping';

export interface SSEEvent {
  type: SSEEventType;
  data: string;
  timestamp?: number;
}

// API response types
export interface CreateSessionResponse {
  sessionId: string;
  message: string;
}

export interface DestroySessionResponse {
  message: string;
}

export interface ExecuteCommandResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// Component props
export interface QuakeTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  height?: number;
  onHeightChange?: (height: number) => void;
}

export interface TerminalEmulatorProps {
  sessionId: string;
  noteId: string;
  onStatusChange: (status: TerminalSessionState['status']) => void;
  onLatencyUpdate: (latency: number) => void;
  onError: (error: string) => void;
}

export interface TerminalHeaderProps {
  status: TerminalSessionState['status'];
  latency?: number;
  onClose: () => void;
  onResize?: (deltaY: number) => void;
}

export interface TerminalFooterProps {
  onCommand: (command: string) => void;
  isConnected: boolean;
}

// Terminal configuration
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground?: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}
