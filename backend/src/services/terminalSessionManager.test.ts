import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { Response } from 'express';
import type { CommandHistoryEntry, ExecuteCommandRequest } from '../types/terminal.types';

const createSandbox = () => {
  const run = vi.fn().mockResolvedValue({
    exit_code: 0,
    stdout: '',
    stderr: ''
  });

  return {
    commands: { run },
    env: { update: vi.fn() },
    kill: vi.fn().mockResolvedValue(undefined)
  };
};

const createResponse = () => {
  const emitter = new EventEmitter();
  return {
    write: vi.fn(),
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter)
  };
};

describe('TerminalSessionManager command timeouts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes request timeout through to sandbox.commands.run', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-1' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    const request: ExecuteCommandRequest = {
      command: 'sleep 5',
      language: 'bash',
      timeout: 120000
    };
    const historyEntry: CommandHistoryEntry = {
      commandId: 'cmd-1',
      command: request.command,
      timestamp: Date.now()
    };

    await (manager as unknown as {
      executeCommandAsync: (
        sessionId: string,
        commandId: string,
        request: ExecuteCommandRequest,
        historyEntry: CommandHistoryEntry,
        startTime: number
      ) => Promise<void>;
    }).executeCommandAsync(
      session.sessionId,
      historyEntry.commandId,
      request,
      historyEntry,
      Date.now()
    );

    expect(mockSandbox.commands.run).toHaveBeenCalledWith(
      'sleep 5',
      expect.objectContaining({ timeoutSeconds: 120 })
    );

    await manager.shutdown();
  });

  it('uses default timeout when none is provided', async () => {
    const mockSandbox = createSandbox();
    mockSandbox.commands.run = vi.fn().mockResolvedValue({
      exit_code: 0,
      stdout: 'ok',
      stderr: ''
    });

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-2' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    const request: ExecuteCommandRequest = {
      command: 'echo ready',
      language: 'bash'
    };
    const historyEntry: CommandHistoryEntry = {
      commandId: 'cmd-2',
      command: request.command,
      timestamp: Date.now()
    };

    await (manager as unknown as {
      executeCommandAsync: (
        sessionId: string,
        commandId: string,
        request: ExecuteCommandRequest,
        historyEntry: CommandHistoryEntry,
        startTime: number
      ) => Promise<void>;
    }).executeCommandAsync(
      session.sessionId,
      historyEntry.commandId,
      request,
      historyEntry,
      Date.now()
    );

    expect(mockSandbox.commands.run).toHaveBeenCalledWith(
      'echo ready',
      expect.objectContaining({ timeoutSeconds: 30 })
    );

    await manager.shutdown();
  });

  it('creates and destroys sessions with state tracking', async () => {
    const mockSandbox = createSandbox();
    const destroySandboxInstance = vi.fn().mockResolvedValue(undefined);

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-state' }),
        destroySandboxInstance
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    expect(session.status).toBe('active');

    await manager.destroySession(session.sessionId);
    expect(destroySandboxInstance).toHaveBeenCalled();
  });

  it('executes commands, updates env, and streams SSE output', async () => {
    const mockSandbox = createSandbox();
    mockSandbox.commands.run = vi.fn()
      .mockResolvedValueOnce({ exit_code: 0, stdout: 'done', stderr: '' })
      .mockResolvedValueOnce({ exit_code: 0, stdout: '/tmp\n', stderr: '' });

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-sse' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const response = createResponse();
    manager.registerSSEClient(session.sessionId, response as unknown as Response);

    const request: ExecuteCommandRequest = {
      command: 'export TEST=123; cd /tmp',
      language: 'bash'
    };

    const historyEntry: CommandHistoryEntry = {
      commandId: 'cmd-3',
      command: request.command,
      timestamp: Date.now()
    };

    await (manager as unknown as {
      executeCommandAsync: (
        sessionId: string,
        commandId: string,
        request: ExecuteCommandRequest,
        historyEntry: CommandHistoryEntry,
        startTime: number
      ) => Promise<void>;
    }).executeCommandAsync(
      session.sessionId,
      historyEntry.commandId,
      request,
      historyEntry,
      Date.now()
    );

    expect(mockSandbox.env.update).toHaveBeenCalledWith({ TEST: '123' });
    expect(response.write).toHaveBeenCalledWith(expect.stringContaining('output'));
    expect(response.write).toHaveBeenCalledWith(expect.stringContaining('complete'));

    await manager.shutdown();
  });

  it('cleans up inactive sessions', async () => {
    const mockSandbox = createSandbox();
    const destroySandboxInstance = vi.fn().mockResolvedValue(undefined);

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-clean' }),
        destroySandboxInstance
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    (manager as unknown as { sessions: Map<string, { lastActivityAt: number; status: string }> }).sessions
      .get(session.sessionId)!.lastActivityAt = Date.now() - (31 * 60 * 1000);

    const result = await manager.cleanupInactiveSessions();

    expect(result.cleanedSessions).toBe(1);
    expect(destroySandboxInstance).toHaveBeenCalled();
  });

  it('throws when session is missing or destroyed', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-missing' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    expect(() => manager.getSession('does-not-exist')).toThrowError(/not found/);

    const session = await manager.createSession();
    await manager.destroySession(session.sessionId);
    expect(() => manager.getSession(session.sessionId)).toThrowError(/not found/);
  });

  it('sends heartbeats to connected clients', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-heartbeat' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const response = createResponse();
    manager.registerSSEClient(session.sessionId, response as unknown as Response);

    await (manager as unknown as { sendHeartbeats: () => void }).sendHeartbeats();

    expect(response.write).toHaveBeenCalledWith(expect.stringContaining('heartbeat'));
    response.emit('close');
  });

  it('reports session stats', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-stats' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const stats = manager.getStats();

    expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
    await manager.destroySession(session.sessionId);
  });
});
