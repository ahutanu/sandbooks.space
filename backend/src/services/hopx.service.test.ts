import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HopxSandbox, ExpiryInfo } from '../types/hopx.types';
type MockFn = ReturnType<typeof vi.fn>;

const baseEnv = {
  NODE_ENV: 'test',
  PORT: 3001,
  HOPX_API_KEY: 'test-api-key',
  FRONTEND_URL: 'http://localhost:5173',
  API_ACCESS_TOKEN: undefined,
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 1000,
  MAX_EXECUTION_TIMEOUT: 5,
  LOG_LEVEL: 'info'
};

// SDK 0.3.4 - Default expiry info for healthy sandbox
const defaultExpiryInfo: ExpiryInfo = {
  expiresAt: new Date(Date.now() + 600000), // 10 min from now
  timeToExpiry: 600,
  isExpired: false,
  isExpiringSoon: false,
  hasTimeout: true
};

const createSandboxStub = (overrides: Partial<HopxSandbox> = {}): HopxSandbox => ({
  sandboxId: 'sandbox-1',
  init: vi.fn().mockResolvedValue(undefined),
  kill: vi.fn().mockResolvedValue(undefined),
  runCode: vi.fn().mockResolvedValue({
    stdout: 'ok',
    stderr: '',
    exit_code: 0,
    execution_time: 10,
    richOutputs: [{ type: 'text', data: 'hello' }]
  }),
  getHealth: vi.fn().mockResolvedValue({ status: 'ok', features: { code_execution: true } }),
  getAgentMetrics: vi.fn().mockResolvedValue({
    uptime_seconds: 100,
    total_executions: 5,
    error_count: 0,
    requests_total: 5,
    avg_duration_ms: 50
  }),
  getInfo: vi.fn().mockResolvedValue({
    status: 'ok',
    resources: { cpu: 1 },
    expiresAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z'
  }),
  // SDK 0.3.4 - Health check methods
  isHealthy: vi.fn().mockResolvedValue(true),
  ensureHealthy: vi.fn().mockResolvedValue(undefined),
  // SDK 0.3.4 - Expiry management methods
  getTimeToExpiry: vi.fn().mockResolvedValue(600),
  isExpiringSoon: vi.fn().mockResolvedValue(false),
  getExpiryInfo: vi.fn().mockResolvedValue(defaultExpiryInfo),
  startExpiryMonitor: vi.fn(),
  stopExpiryMonitor: vi.fn(),
  env: {
    update: vi.fn()
  },
  commands: {
    run: vi.fn()
  },
  terminal: {
    connect: vi.fn(),
    sendInput: vi.fn(),
    resize: vi.fn()
  },
  ...overrides
});

// Mock SDK error classes
class MockSandboxExpiredError extends Error {
  sandboxId?: string;
  createdAt?: string;
  expiresAt?: string;
  constructor(message: string, metadata: { sandboxId?: string; createdAt?: string; expiresAt?: string } = {}) {
    super(message);
    this.name = 'SandboxExpiredError';
    this.sandboxId = metadata.sandboxId;
    this.createdAt = metadata.createdAt;
    this.expiresAt = metadata.expiresAt;
  }
}

class MockTokenExpiredError extends Error {
  constructor(message = 'Token expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

const loadService = async (
  sandbox: HopxSandbox,
  envOverrides: Partial<typeof baseEnv> = {},
  sandboxCreateMock?: MockFn
) => {
  vi.doMock('../config/env', () => ({
    __esModule: true,
    default: { ...baseEnv, ...envOverrides }
  }));

  const create = sandboxCreateMock || vi.fn().mockResolvedValue(sandbox);

  vi.doMock('@hopx-ai/sdk', () => ({
    Sandbox: { create },
    SandboxExpiredError: MockSandboxExpiredError,
    TokenExpiredError: MockTokenExpiredError
  }));

  const hopxService = (await import('./hopx.service')).default;
  return { hopxService, create };
};

describe('HopxService executeCode (SDK 0.3.4)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('honors MAX_EXECUTION_TIMEOUT env value', async () => {
    vi.useFakeTimers();

    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 1 });
    const { TimeoutError } = await import('../utils/errors');

    vi.spyOn(hopxService as unknown as Record<string, unknown>, 'executeWithRecovery')
      .mockReturnValue(new Promise(() => {
        // Never resolve to force timeout path
      }) as never);

    const executionPromise = hopxService.executeCode('console.log(1);', 'javascript');
    const expectation = expect(executionPromise).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(1100);

    await expectation;
  });

  it('executes code successfully with preflight option (SDK 0.3.4)', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 });

    const result = await hopxService.executeCode('print("hi")', 'python');

    // SDK 0.3.4: runCode should include preflight: true
    expect((sandbox.runCode as MockFn)).toHaveBeenCalledWith('print("hi")', {
      language: 'python',
      timeout: 120,
      preflight: true
    });
    expect(result.richOutputs?.[0]).toEqual({ type: 'text', data: 'hello' });
    expect(result.exitCode).toBe(0);
  });

  it('retries recoverable errors before succeeding', async () => {
    vi.useFakeTimers();
    const sandbox = createSandboxStub({
      runCode: vi.fn()
        .mockRejectedValueOnce({ code: 'EXECUTION_TIMEOUT', message: 'timeout' })
        .mockResolvedValueOnce({
          stdout: 'ok',
          stderr: '',
          exit_code: 0,
          execution_time: 5,
          richOutputs: []
        })
    });

    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 10 });
    (hopxService as unknown as { getHealthySandbox: () => Promise<HopxSandbox> }).getHealthySandbox = vi.fn().mockResolvedValue(sandbox);
    (hopxService as unknown as { sandboxId: string }).sandboxId = 'sandbox-retry';

    const execution = (hopxService as unknown as {
      executeWithRecovery: (code: string, language: string) => Promise<unknown>;
    }).executeWithRecovery('code', 'javascript');

    await vi.advanceTimersByTimeAsync(2000);
    const result = await execution;

    expect(result).toMatchObject({ stdout: 'ok', exitCode: 0 });
    expect((sandbox.runCode as MockFn)).toHaveBeenCalledTimes(2);
  });

  it('recreates sandbox when SDK isHealthy returns false', async () => {
    const firstSandbox = createSandboxStub({
      sandboxId: 'sandbox-old',
      isHealthy: vi.fn().mockResolvedValue(false) // SDK 0.3.4
    });
    const newSandbox = createSandboxStub({ sandboxId: 'sandbox-new' });
    const createMock = vi.fn().mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(firstSandbox, { MAX_EXECUTION_TIMEOUT: 200 }, createMock as unknown as MockFn);

    await hopxService.executeCode('1+1', 'javascript');

    // Set sandbox to unhealthy state
    (firstSandbox.isHealthy as MockFn).mockResolvedValue(false);

    const healthySandbox = await hopxService.getSandbox();

    expect(firstSandbox.kill).toHaveBeenCalled();
    expect(healthySandbox).toBe(newSandbox);
  });

  it('refreshes sandbox when SDK isExpiringSoon returns true', async () => {
    const firstSandbox = createSandboxStub({
      sandboxId: 'sandbox-expiring',
      isExpiringSoon: vi.fn().mockResolvedValue(true), // SDK 0.3.4
      getExpiryInfo: vi.fn().mockResolvedValue({
        ...defaultExpiryInfo,
        isExpiringSoon: true,
        timeToExpiry: 30
      })
    });
    const newSandbox = createSandboxStub({ sandboxId: 'sandbox-refreshed' });
    const createMock = vi.fn().mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(firstSandbox, { MAX_EXECUTION_TIMEOUT: 200 }, createMock as unknown as MockFn);
    await hopxService.executeCode('console.log("hi")', 'javascript');

    // Set sandbox to expiring soon
    (firstSandbox.isExpiringSoon as MockFn).mockResolvedValue(true);

    const sandbox = await hopxService.getSandbox();

    expect(firstSandbox.stopExpiryMonitor).toHaveBeenCalled();
    expect(firstSandbox.kill).toHaveBeenCalled();
    expect(sandbox).toBe(newSandbox);
  });

  it('returns sandbox info errors when getInfo fails', async () => {
    const sandbox = createSandboxStub({
      getInfo: vi.fn().mockRejectedValue(new Error('info failure'))
    });
    const { hopxService } = await loadService(sandbox);

    (hopxService as unknown as { sandbox: HopxSandbox | null }).sandbox = sandbox;

    const info = await hopxService.getSandboxInfo();
    expect(info.exists).toBe(false);
    expect(info.error).toBeDefined();
  });

  it('forceRecreateSandbox and cleanup reset state', async () => {
    const sandbox = createSandboxStub({ sandboxId: 'original' });
    const newSandbox = createSandboxStub({ sandboxId: 'recreated' });
    const createMock = vi.fn().mockResolvedValueOnce(sandbox).mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 }, createMock as unknown as MockFn);
    await hopxService.executeCode('3+3', 'javascript');

    const recreated = await hopxService.forceRecreateSandbox();
    expect(recreated.sandboxId).toBe('recreated');

    (hopxService as unknown as { sandbox: HopxSandbox | null }).sandbox = newSandbox;
    await hopxService.cleanup();
    const info = await hopxService.getSandboxInfo();
    expect(info.exists).toBe(false);
  });

  it('throws on non-recoverable execution errors', async () => {
    const sandbox = createSandboxStub({
      runCode: vi.fn().mockRejectedValue({ code: 'FATAL', message: 'boom' })
    });

    const { hopxService } = await loadService(sandbox);
    (hopxService as unknown as { getHealthySandbox: () => Promise<HopxSandbox> }).getHealthySandbox = vi.fn().mockResolvedValue(sandbox);

    await expect((hopxService as unknown as {
      executeWithRecovery: (code: string, language: string) => Promise<unknown>;
    }).executeWithRecovery('code', 'javascript')).rejects.toMatchObject({ message: 'boom' });
  });

  it('converts typescript executions to javascript runtime', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 });

    await hopxService.executeCode('const x: number = 1', 'typescript');
    // TypeScript has its own default timeout of 60s, but runs as JavaScript
    expect((sandbox.runCode as MockFn)).toHaveBeenCalledWith(expect.any(String), {
      language: 'javascript',
      timeout: 60,
      preflight: true
    });
  });

  it('provides sandbox info and handles destroy', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 });

    await hopxService.executeCode('2+2', 'javascript');
    const info = await hopxService.getSandboxInfo();
    expect(info.exists).toBe(true);
    expect(info.sandboxId).toBeDefined();

    await hopxService.destroySandbox();
    const missing = await hopxService.getSandboxInfo();
    expect(missing.exists).toBe(false);
  });

  it('classifies SDK error types correctly (SDK 0.3.4)', async () => {
    const sandbox = createSandboxStub();

    vi.doMock('../config/env', () => ({
      __esModule: true,
      default: baseEnv
    }));

    vi.doMock('@hopx-ai/sdk', () => ({
      Sandbox: { create: vi.fn().mockResolvedValue(sandbox) },
      SandboxExpiredError: MockSandboxExpiredError,
      TokenExpiredError: MockTokenExpiredError
    }));

    const { default: hopxService } = await import('./hopx.service');
    const classify = (hopxService as unknown as { classifyError: (err: unknown) => { category: string; recoverable: boolean } }).classifyError;

    // SDK 0.3.4: Native error types
    expect(classify(new MockSandboxExpiredError('expired')).category).toBe('expired');
    expect(classify(new MockTokenExpiredError()).category).toBe('token');

    // Legacy error classification
    expect(classify({ code: 'ETIMEDOUT' }).category).toBe('transient');
    expect(classify({ code: 'NOT_FOUND' }).category).toBe('expired');
    expect(classify({ code: 'INTERNAL_ERROR' }).category).toBe('corruption');
    expect(classify({ code: 'ENOTFOUND' }).category).toBe('network');
    expect(classify({ code: 'EXECUTION_TIMEOUT', message: 'timeout' }).category).toBe('timeout');
    expect(classify({ code: 'UNKNOWN', message: 'other' }).category).toBe('unknown');
  });

  it('returns healthy sandbox when isHealthy is true', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 });
    await hopxService.executeCode('1', 'javascript');

    const initial = (hopxService as unknown as { sandbox: HopxSandbox }).sandbox;
    const healthy = await hopxService.getSandbox();
    expect(healthy).toBe(initial);
  });

  it('provides health summary with expiry info (SDK 0.3.4)', async () => {
    const sandbox = createSandboxStub({
      getHealth: vi.fn().mockResolvedValue({
        status: 'ok',
        features: { code_execution: true },
        uptime_seconds: 5,
        version: '1.0.0'
      }),
      getAgentMetrics: vi.fn().mockResolvedValue({
        uptime_seconds: 10,
        total_executions: 2,
        error_count: 1,
        requests_total: 2,
        avg_duration_ms: 3
      }),
      getExpiryInfo: vi.fn().mockResolvedValue({
        expiresAt: new Date('2025-01-01T00:10:00Z'),
        timeToExpiry: 500,
        isExpired: false,
        isExpiringSoon: false,
        hasTimeout: true
      })
    });
    const { hopxService } = await loadService(sandbox);
    (hopxService as unknown as { sandbox: HopxSandbox | null }).sandbox = sandbox;
    (hopxService as unknown as { sandboxId: string | null }).sandboxId = 'health-sandbox';

    const result = await hopxService.getHealth();
    expect(result.isHealthy).toBe(true);
    expect(result.metrics?.errors).toBe(1);
    // SDK 0.3.4: Expiry info in health response
    expect(result.expiry?.timeToExpiry).toBe(500);
    expect(result.expiry?.isExpiringSoon).toBe(false);

    sandbox.isHealthy = vi.fn().mockRejectedValue(new Error('health failure'));
    const failed = await hopxService.getHealth();
    expect(failed.isHealthy).toBe(false);
    expect(failed.error).toBeDefined();
  });

  it('handles sandbox creation and destruction error paths', async () => {
    vi.doMock('@hopx-ai/sdk', () => ({
      Sandbox: {
        create: vi.fn().mockRejectedValue(new Error('create failed'))
      },
      SandboxExpiredError: MockSandboxExpiredError,
      TokenExpiredError: MockTokenExpiredError
    }));
    const { default: hopxServiceError } = await import('./hopx.service');
    await expect(hopxServiceError.createIsolatedSandbox()).rejects.toThrow();

    vi.resetModules();
    vi.clearAllMocks();

    const sandbox = createSandboxStub({
      kill: vi.fn().mockRejectedValue(new Error('kill failed'))
    });
    const { hopxService } = await loadService(sandbox);

    await expect(hopxService.destroySandboxInstance(sandbox, 'sandbox-error')).rejects.toThrow();
  });

  it('auto-recovers from SandboxExpiredError (SDK 0.3.4)', async () => {
    const expiredSandbox = createSandboxStub({
      sandboxId: 'expired-sandbox',
      isExpiringSoon: vi.fn().mockRejectedValue(new MockSandboxExpiredError('Sandbox expired', {
        sandboxId: 'expired-sandbox',
        expiresAt: '2025-01-01T00:00:00Z'
      }))
    });
    const newSandbox = createSandboxStub({ sandboxId: 'new-sandbox' });
    const createMock = vi.fn()
      .mockResolvedValueOnce(expiredSandbox)
      .mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(expiredSandbox, { MAX_EXECUTION_TIMEOUT: 200 }, createMock as unknown as MockFn);

    // First execution creates the expired sandbox
    await hopxService.executeCode('1', 'javascript');

    // Next getSandbox should detect expiry and recreate
    const sandbox = await hopxService.getSandbox();
    expect(sandbox).toBe(newSandbox);
  });

  it('starts and stops expiry monitor on sandbox lifecycle', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 200 });

    await hopxService.executeCode('1', 'javascript');

    // SDK 0.3.4: Expiry monitor should be started on creation
    expect(sandbox.startExpiryMonitor).toHaveBeenCalled();

    await hopxService.destroySandbox();

    // SDK 0.3.4: Expiry monitor should be stopped on destruction
    expect(sandbox.stopExpiryMonitor).toHaveBeenCalled();
  });
});
