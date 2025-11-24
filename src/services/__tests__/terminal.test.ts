import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.stubEnv('VITE_API_URL', 'http://localhost:3001');

describe('TerminalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends input to terminal', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'sent' })
    });

    const { terminalService } = await import('../terminal');
    await terminalService.sendInput('sess-1', 'pwd\n');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/terminal/sess-1/input',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: 'pwd\n' })
      })
    );
  });

  it('resizes terminal', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Terminal resized' })
    });

    const { terminalService } = await import('../terminal');
    await terminalService.resize('sess-1', 100, 30);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/terminal/sess-1/resize',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ cols: 100, rows: 30 })
      })
    );
  });

  it('creates terminal session', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'new-sess',
        sandboxId: 'sandbox-1',
        status: 'active',
        createdAt: Date.now(),
        expiresIn: 1800000
      })
    });

    const { terminalService } = await import('../terminal');
    const result = await terminalService.createSession('note-1');

    expect(result.sessionId).toBe('new-sess');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/terminal/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ noteId: 'note-1' })
      })
    );
  });

  it('destroys terminal session', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Session destroyed', sessionId: 'sess-1' })
    });

    const { terminalService } = await import('../terminal');
    await terminalService.destroySession('sess-1');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/terminal/sessions/sess-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handles sendInput errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Session not found' })
    });

    const { terminalService } = await import('../terminal');

    await expect(
      terminalService.sendInput('invalid-sess', 'test')
    ).rejects.toThrow('Failed to send input');
  });

  it('handles resize errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid dimensions' })
    });

    const { terminalService } = await import('../terminal');

    await expect(
      terminalService.resize('sess-1', 10, 5)
    ).rejects.toThrow('Failed to resize terminal');
  });
});
