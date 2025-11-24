import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import type { Response } from 'express';

const createMockWebSocket = () => {
  const emitter = new EventEmitter();
  return {
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter),
    close: vi.fn(),
    send: vi.fn()
  };
};

const createSandbox = () => {
  const mockWs = createMockWebSocket();

  return {
    init: vi.fn().mockResolvedValue(undefined),
    commands: {
      run: vi.fn().mockResolvedValue({
        exit_code: 0,
        stdout: '',
        stderr: ''
      })
    },
    env: { update: vi.fn() },
    terminal: {
      connect: vi.fn().mockResolvedValue(mockWs),
      sendInput: vi.fn(),
      resize: vi.fn()
    },
    kill: vi.fn().mockResolvedValue(undefined),
    _mockWebSocket: mockWs
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

describe('TerminalSessionManager with Terminal API', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates session and connects to WebSocket terminal', async () => {
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

    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe('active');
    expect(mockSandbox.init).toHaveBeenCalled();
    expect(mockSandbox.terminal.connect).toHaveBeenCalled();

    await manager.shutdown();
  });

  it('sends input to WebSocket terminal', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-2' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    await manager.sendInput(session.sessionId, 'ls\n');

    expect(mockSandbox.terminal.sendInput).toHaveBeenCalledWith(
      mockSandbox._mockWebSocket,
      'ls\n'
    );

    await manager.shutdown();
  });

  it('resizes terminal via WebSocket', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-3' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    await manager.resize(session.sessionId, 80, 24);

    expect(mockSandbox.terminal.resize).toHaveBeenCalledWith(
      mockSandbox._mockWebSocket,
      80,
      24
    );

    await manager.shutdown();
  });

  it('forwards WebSocket messages to SSE clients', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-4' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const response = createResponse();
    manager.registerSSEClient(session.sessionId, response as unknown as Response);

    const mockMessage = JSON.stringify({ type: 'output', data: 'hello' });
    mockSandbox._mockWebSocket.emit('message', Buffer.from(mockMessage));

    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('terminal_message')
    );

    await manager.shutdown();
  });

  it('closes WebSocket on session destroy', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-5' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');

    const session = await manager.createSession();
    await manager.destroySession(session.sessionId);

    expect(mockSandbox._mockWebSocket.close).toHaveBeenCalled();

    await manager.shutdown();
  });

  it('handles WebSocket errors gracefully', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-6' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const response = createResponse();
    manager.registerSSEClient(session.sessionId, response as unknown as Response);

    mockSandbox._mockWebSocket.emit('error', new Error('WebSocket error'));

    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('error')
    );

    await manager.shutdown();
  });

  it('handles WebSocket close event', async () => {
    const mockSandbox = createSandbox();

    vi.doMock('./hopx.service', () => ({
      __esModule: true,
      default: {
        createIsolatedSandbox: vi.fn().mockResolvedValue({ sandbox: mockSandbox, sandboxId: 'sandbox-7' }),
        destroySandboxInstance: vi.fn().mockResolvedValue(undefined)
      }
    }));

    const { default: manager } = await import('./terminalSessionManager');
    const session = await manager.createSession();
    const response = createResponse();
    manager.registerSSEClient(session.sessionId, response as unknown as Response);

    mockSandbox._mockWebSocket.emit('close');

    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('info')
    );

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
