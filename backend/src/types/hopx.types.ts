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

export interface HopxSandbox {
  sandboxId: string;
  runCode: (code: string, opts: { language: string }) => Promise<HopxCommandResult>;
  getHealth: () => Promise<HopxHealth>;
  getAgentMetrics: () => Promise<HopxMetrics>;
  getInfo: () => Promise<HopxSandboxInfo>;
  kill: () => Promise<void>;
  env: {
    update: (vars: Record<string, string>) => Promise<void>;
  };
  commands: {
    run: (command: string, opts?: { timeoutSeconds?: number; workingDir?: string }) => Promise<HopxCommandResult>;
  };
}
