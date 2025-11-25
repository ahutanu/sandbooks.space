import { WebSocket } from 'ws';

// SDK 0.3.4 - ExpiryInfo interface
export interface ExpiryInfo {
  expiresAt: Date | null;
  timeToExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  hasTimeout: boolean;
}

export interface HopxCommandResult {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  execution_time?: number;
  richOutputs?: unknown[];
}

export interface HopxHealth {
  status: string;
  features?: Record<string, unknown>;
  uptime_seconds?: number;
  version?: string;
  [key: string]: unknown;
}

export interface HopxMetrics {
  uptime_seconds: number;
  total_executions: number;
  error_count: number;
  requests_total: number;
  avg_duration_ms: number;
}

export interface HopxSandboxInfo {
  status: string;
  resources?: unknown;
  expiresAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// SDK 0.3.4 - Code execution options with preflight
export interface CodeExecutionOptions {
  language: string;
  timeout?: number;
  /** SDK 0.3.4: Run health check before execution */
  preflight?: boolean;
}

export interface HopxSandbox {
  sandboxId: string;
  init: () => Promise<void>;
  runCode: (code: string, opts: CodeExecutionOptions) => Promise<HopxCommandResult>;
  getHealth: () => Promise<HopxHealth>;
  getAgentMetrics: () => Promise<HopxMetrics>;
  getInfo: () => Promise<HopxSandboxInfo>;
  kill: () => Promise<void>;

  // SDK 0.3.4 - Health check methods
  /** Check if sandbox is healthy and ready */
  isHealthy: () => Promise<boolean>;
  /** Throw if sandbox is not healthy or expired */
  ensureHealthy: () => Promise<void>;

  // SDK 0.3.4 - Expiry management methods
  /** Get seconds until sandbox expires (negative if expired), null if no timeout */
  getTimeToExpiry: () => Promise<number | null>;
  /** Check if expiring within threshold (default: 300s) */
  isExpiringSoon: (thresholdSeconds?: number) => Promise<boolean | null>;
  /** Get comprehensive expiry information */
  getExpiryInfo: () => Promise<ExpiryInfo>;
  /** Start monitoring for expiry warnings (JS SDK only) */
  startExpiryMonitor: (
    callback: (info: ExpiryInfo) => void,
    thresholdSeconds?: number,
    checkIntervalSeconds?: number
  ) => void;
  /** Stop expiry monitoring (JS SDK only) */
  stopExpiryMonitor: () => void;

  env: {
    update: (vars: Record<string, string>) => Promise<void>;
  };
  commands: {
    run: (command: string, opts?: { timeout?: number; workingDir?: string }) => Promise<HopxCommandResult>;
  };
  terminal: {
    connect: () => Promise<WebSocket>;
    sendInput: (ws: WebSocket, data: string) => void;
    resize: (ws: WebSocket, cols: number, rows: number) => void;
  };
}
