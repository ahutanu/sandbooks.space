import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import localTerminalService from '../localTerminal.service';
import * as pty from 'node-pty';

// Mock node-pty
vi.mock('node-pty', () => ({
  spawn: vi.fn(),
}));

describe('LocalTerminalService', () => {
  let mockPtyProcess: pty.IPty;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENABLE_LOCAL_TERMINAL = 'true';
    
    // Setup mock PTY process
    mockPtyProcess = {
      onData: vi.fn(),
      onExit: vi.fn(),
      kill: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
    } as unknown as pty.IPty;
    (pty.spawn as unknown as vi.Mock).mockReturnValue(mockPtyProcess);
  });

  afterEach(async () => {
    await localTerminalService.shutdown();
    delete process.env.ENABLE_LOCAL_TERMINAL;
    delete process.env.API_ACCESS_TOKEN;
    delete process.env.MAX_LOCAL_TERMINAL_SESSIONS;
  });

  it('should create session with proper shell args', async () => {
    const result = await localTerminalService.createSession({ cols: 100, rows: 40 });
    
    expect(pty.spawn).toHaveBeenCalled();
    expect(result.sessionId).toBeDefined();
    
    const session = localTerminalService.getSession(result.sessionId);
    expect(session).toBeDefined();
    expect(session?.cols).toBe(100);
  });

  it('should throw error if ENABLE_LOCAL_TERMINAL is not set', async () => {
    process.env.ENABLE_LOCAL_TERMINAL = 'false';
    await expect(localTerminalService.createSession()).rejects.toThrow('Local terminal is disabled');
  });

  it('should strip secrets from environment', async () => {
    process.env.API_ACCESS_TOKEN = 'super-secret';
    const { sessionId } = await localTerminalService.createSession();
    const session = localTerminalService.getSession(sessionId);
    expect(session?.env.API_ACCESS_TOKEN).toBeUndefined();
  });

  it('should enforce max sessions', async () => {
    process.env.MAX_LOCAL_TERMINAL_SESSIONS = '1';
    await localTerminalService.createSession();
    await expect(localTerminalService.createSession()).rejects.toThrow(/Maximum local terminal sessions/);
  });

  it('should handle PTY output streaming', async () => {
    const session = await localTerminalService.createSession();
    const dataCallback = vi.fn();
    localTerminalService.on('data', dataCallback);

    // Get the data handler registered with ptyProcess.onData
    const onDataHandler = mockPtyProcess.onData.mock.calls[0][0];
    onDataHandler('test output');

    expect(dataCallback).toHaveBeenCalledWith(session.sessionId, 'test output');
  });

  it('should handle resize events', async () => {
    const session = await localTerminalService.createSession();
    localTerminalService.resizeSession(session.sessionId, 120, 60);
    
    expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 60);
    const updatedSession = localTerminalService.getSession(session.sessionId);
    expect(updatedSession?.cols).toBe(120);
    expect(updatedSession?.rows).toBe(60);
  });

  it('should gracefully destroy session', async () => {
    const session = await localTerminalService.createSession();

    // Mock exit behavior
    mockPtyProcess.kill.mockImplementationOnce(() => {
      // Simulate exit handler call
      const exitHandler = mockPtyProcess.onExit.mock.calls[0][0];
      exitHandler();
    });

    await localTerminalService.destroySession(session.sessionId);

    expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGTERM');
    expect(localTerminalService.getSession(session.sessionId)).toBeUndefined();
  });

  describe('Terminal Size Validation', () => {
    it('should reject negative dimensions', async () => {
      await expect(localTerminalService.createSession({ cols: -10, rows: 20 }))
        .rejects.toThrow('Terminal dimensions must be positive');
      await expect(localTerminalService.createSession({ cols: 80, rows: -5 }))
        .rejects.toThrow('Terminal dimensions must be positive');
    });

    it('should reject zero dimensions', async () => {
      await expect(localTerminalService.createSession({ cols: 0, rows: 24 }))
        .rejects.toThrow('Terminal dimensions must be positive');
      await expect(localTerminalService.createSession({ cols: 80, rows: 0 }))
        .rejects.toThrow('Terminal dimensions must be positive');
    });

    it('should reject oversized dimensions', async () => {
      await expect(localTerminalService.createSession({ cols: 1001, rows: 24 }))
        .rejects.toThrow('Terminal dimensions exceed maximum allowed size');
      await expect(localTerminalService.createSession({ cols: 80, rows: 1500 }))
        .rejects.toThrow('Terminal dimensions exceed maximum allowed size');
    });

    it('should reject too small dimensions', async () => {
      await expect(localTerminalService.createSession({ cols: 5, rows: 24 }))
        .rejects.toThrow('Terminal dimensions too small');
      await expect(localTerminalService.createSession({ cols: 80, rows: 1 }))
        .rejects.toThrow('Terminal dimensions too small');
    });

    it('should reject non-integer dimensions', async () => {
      await expect(localTerminalService.createSession({ cols: 80.5, rows: 24 }))
        .rejects.toThrow('Terminal dimensions must be integers');
      await expect(localTerminalService.createSession({ cols: 80, rows: 24.7 }))
        .rejects.toThrow('Terminal dimensions must be integers');
    });

    it('should reject invalid resize dimensions', async () => {
      const { sessionId } = await localTerminalService.createSession();

      expect(() => localTerminalService.resizeSession(sessionId, -10, 20))
        .toThrow('Terminal dimensions must be positive');
      expect(() => localTerminalService.resizeSession(sessionId, 1001, 20))
        .toThrow('Terminal dimensions exceed maximum allowed size');
    });
  });

  describe('PTY Spawn Error Handling', () => {
    it('should handle PTY spawn failure gracefully', async () => {
      (pty.spawn as unknown as vi.Mock).mockImplementationOnce(() => {
        throw new Error('Shell not found: /bin/nonexistent');
      });

      await expect(localTerminalService.createSession())
        .rejects.toThrow(/Failed to spawn shell.*Shell not found/);
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const session1 = await localTerminalService.createSession();
      const session2 = await localTerminalService.createSession();
      const session3 = await localTerminalService.createSession();

      expect(localTerminalService.getSession(session1.sessionId)).toBeDefined();
      expect(localTerminalService.getSession(session2.sessionId)).toBeDefined();
      expect(localTerminalService.getSession(session3.sessionId)).toBeDefined();

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session2.sessionId).not.toBe(session3.sessionId);
    });

    it('should handle writing to multiple sessions independently', async () => {
      const session1 = await localTerminalService.createSession();
      const session2 = await localTerminalService.createSession();

      localTerminalService.writeToSession(session1.sessionId, 'command1\n');
      localTerminalService.writeToSession(session2.sessionId, 'command2\n');

      const ptyProcess1 = (pty.spawn as unknown as vi.Mock).mock.results[0].value;
      const ptyProcess2 = (pty.spawn as unknown as vi.Mock).mock.results[1].value;

      expect(ptyProcess1.write).toHaveBeenCalledWith('command1\n');
      expect(ptyProcess2.write).toHaveBeenCalledWith('command2\n');
    });
  });
});
