import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudTerminalProvider } from '../cloudTerminalProvider';
import { terminalService } from '../../terminal';

vi.mock('../../terminal', () => ({
  terminalService: {
    healthCheck: vi.fn(),
    createSession: vi.fn(),
    destroySession: vi.fn(),
    sendInput: vi.fn(),
    resize: vi.fn(),
    connectStream: vi.fn(),
    disconnectStream: vi.fn()
  }
}));

describe('CloudTerminalProvider', () => {
  let provider: CloudTerminalProvider;

  beforeEach(() => {
    provider = new CloudTerminalProvider();
    vi.clearAllMocks();
  });

  it('has correct provider metadata', () => {
    expect(provider.provider).toBe('cloud');
    expect(provider.name).toBe('Cloud Terminal (Hopx)');
    expect(provider.mode).toBe('terminal');
  });

  it('checks availability via backend health', async () => {
    vi.mocked(terminalService.healthCheck).mockResolvedValue(true);
    const available = await provider.isAvailable();
    expect(available).toBe(true);
    expect(terminalService.healthCheck).toHaveBeenCalled();
  });

  it('creates session', async () => {
    vi.mocked(terminalService.createSession).mockResolvedValue({
      sessionId: 'test-session',
      sandboxId: 'test-sandbox',
      status: 'active',
      createdAt: Date.now(),
      expiresIn: 1800000
    });
    const result = await provider.createSession();
    expect(result.sessionId).toBe('test-session');
  });

  it('sends input', async () => {
    await provider.sendInput('sess', 'ls\n');
    expect(terminalService.sendInput).toHaveBeenCalledWith('sess', 'ls\n');
  });

  it('resizes terminal', async () => {
    await provider.resize('sess', 80, 24);
    expect(terminalService.resize).toHaveBeenCalledWith('sess', 80, 24);
  });
});
