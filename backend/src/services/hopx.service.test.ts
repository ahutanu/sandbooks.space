import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HopxSandbox } from '../types/hopx.types';
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

const createSandboxStub = (overrides: Partial<HopxSandbox> = {}): HopxSandbox => ({
  sandboxId: 'sandbox-1',
  kill: vi.fn().mockResolvedValue(undefined),
  runCode: vi.fn().mockResolvedValue({
    stdout: 'ok',
    stderr: '',
    exit_code: 0,
    execution_time: 10,
    richOutputs: [{ type: 'text', data: 'hello' }]
  }),
  getHealth: vi.fn(),
  getAgentMetrics: vi.fn(),
  getInfo: vi.fn().mockResolvedValue({
    status: 'ok',
    resources: { cpu: 1 },
    expiresAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z'
  }),
  env: {
    update: vi.fn()
  },
  commands: {
    run: vi.fn()
  },
  ...overrides
});

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
    Sandbox: {
      create
    }
  }));

  const hopxService = (await import('./hopx.service')).default;
  return { hopxService, create };
};

describe('HopxService executeCode', () => {
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

  it('executes code successfully and normalizes outputs', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox, { MAX_EXECUTION_TIMEOUT: 10 });

    const result = await hopxService.executeCode('print("hi")', 'python');

    expect((sandbox.runCode as MockFn)).toHaveBeenCalledWith('print("hi")', { language: 'python' });
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

  it('recreates sandbox when health check fails', async () => {
    const firstSandbox = createSandboxStub({
      sandboxId: 'sandbox-old',
      getHealth: vi.fn().mockResolvedValue({ status: 'error', features: { code_execution: true } })
    });
    const newSandbox = createSandboxStub({ sandboxId: 'sandbox-new' });
    const createMock = vi.fn().mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(firstSandbox, {}, createMock as unknown as MockFn);

    await hopxService.executeCode('1+1', 'javascript');
    (hopxService as unknown as { lastHealthCheck: number }).lastHealthCheck = Date.now() - 40000;

    const healthySandbox = await hopxService.getSandbox();

    expect(firstSandbox.kill).toHaveBeenCalled();
    expect(healthySandbox).toBe(newSandbox);
  });

  it('refreshes expiring sandbox', async () => {
    const firstSandbox = createSandboxStub({ sandboxId: 'sandbox-expiring' });
    const newSandbox = createSandboxStub({ sandboxId: 'sandbox-refreshed' });
    const createMock = vi.fn().mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(newSandbox);

    const { hopxService } = await loadService(firstSandbox, {}, createMock as unknown as MockFn);
    await hopxService.executeCode('console.log("hi")', 'javascript');

    (hopxService as unknown as { sandboxCreatedAt: number }).sandboxCreatedAt = Date.now() - (3600 * 1000);

    const sandbox = await hopxService.getSandbox();

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

    const { hopxService } = await loadService(sandbox, {}, createMock as unknown as MockFn);
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
    const { hopxService } = await loadService(sandbox);

    await hopxService.executeCode('const x: number = 1', 'typescript');
    expect((sandbox.runCode as MockFn)).toHaveBeenCalledWith(expect.any(String), { language: 'javascript' });
  });

  it('provides sandbox info and handles destroy', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox);

    await hopxService.executeCode('2+2', 'javascript');
    const info = await hopxService.getSandboxInfo();
    expect(info.exists).toBe(true);
    expect(info.sandboxId).toBeDefined();

    await hopxService.destroySandbox();
    const missing = await hopxService.getSandboxInfo();
    expect(missing.exists).toBe(false);
  });

  it('classifies errors into expected categories', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox);
    const classify = (hopxService as unknown as { classifyError: (err: unknown) => { category: string; recoverable: boolean } }).classifyError;

    expect(classify({ code: 'ETIMEDOUT' }).category).toBe('transient');
    expect(classify({ code: 'UNAUTHORIZED' }).category).toBe('auth');
    expect(classify({ code: 'NOT_FOUND' }).category).toBe('expired');
    expect(classify({ code: 'INTERNAL_ERROR' }).category).toBe('corruption');
    expect(classify({ code: 'ENOTFOUND' }).category).toBe('network');
    expect(classify({ code: 'EXECUTION_TIMEOUT', message: 'timeout' }).category).toBe('timeout');
    expect(classify({ code: 'UNKNOWN', message: 'other' }).category).toBe('unknown');
  });

  it('returns cached sandbox when health check is fresh', async () => {
    const sandbox = createSandboxStub();
    const { hopxService } = await loadService(sandbox);
    await hopxService.executeCode('1', 'javascript');

    const initial = (hopxService as unknown as { sandbox: HopxSandbox }).sandbox;
    (hopxService as unknown as { lastHealthCheck: number }).lastHealthCheck = Date.now();

    const healthy = await hopxService.getSandbox();
    expect(healthy).toBe(initial);
  });

  it('handles checkHealth edge cases and metrics', async () => {
    const sandbox = createSandboxStub({
      getHealth: vi.fn().mockResolvedValue({ status: 'ok', features: { code_execution: false } })
    });
    const { hopxService } = await loadService(sandbox);
    (hopxService as unknown as { sandbox: HopxSandbox | null }).sandbox = sandbox;

    const noCodeExec = await (hopxService as unknown as { checkHealth: () => Promise<boolean> }).checkHealth();
    expect(noCodeExec).toBe(false);

    sandbox.getHealth = vi.fn().mockResolvedValue({ status: 'ok', features: { code_execution: true } });
    sandbox.getAgentMetrics = vi.fn().mockResolvedValue({
      uptime_seconds: 10,
      total_executions: 10,
      error_count: 9,
      requests_total: 10,
      avg_duration_ms: 1
    });
    const highErrorRate = await (hopxService as unknown as { checkHealth: () => Promise<boolean> }).checkHealth();
    expect(highErrorRate).toBe(false);

    sandbox.getAgentMetrics = vi.fn().mockRejectedValue(new Error('metrics fail'));
    sandbox.getHealth = vi.fn().mockResolvedValue({ status: 'ok', features: { code_execution: true } });
    const metricsError = await (hopxService as unknown as { checkHealth: () => Promise<boolean> }).checkHealth();
    expect(metricsError).toBe(true);
  });

  it('provides health summary and error fallback', async () => {
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
      })
    });
    const { hopxService } = await loadService(sandbox);
    (hopxService as unknown as { sandbox: HopxSandbox | null }).sandbox = sandbox;
    (hopxService as unknown as { sandboxId: string | null }).sandboxId = 'health-sandbox';

    const result = await hopxService.getHealth();
    expect(result.isHealthy).toBe(true);
    expect(result.metrics?.errors).toBe(1);

    sandbox.getHealth = vi.fn().mockRejectedValue(new Error('health failure'));
    const failed = await hopxService.getHealth();
    expect(failed.isHealthy).toBe(false);
    expect(failed.error).toBeDefined();
  });

  it('handles sandbox creation and destruction error paths', async () => {
    vi.doMock('@hopx-ai/sdk', () => ({
      Sandbox: {
        create: vi.fn().mockRejectedValue(new Error('create failed'))
      }
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
});
