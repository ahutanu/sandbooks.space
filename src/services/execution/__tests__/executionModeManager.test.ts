import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionModeManager } from '../executionModeManager';
import { cloudExecutionProvider } from '../cloudProvider';
import { localExecutionProvider } from '../localProvider';
import * as platformUtils from '../../../utils/platform';
import type { TerminalProviderInterface } from '../../terminal/types';

// Mock dependencies
vi.mock('../cloudProvider');
vi.mock('../localProvider');
vi.mock('../../../utils/platform');

describe('ExecutionModeManager', () => {
  let manager: ExecutionModeManager;

  beforeEach(() => {
    manager = new ExecutionModeManager();
    vi.clearAllMocks();
  });

  it('should default to cloud mode', () => {
    expect(manager.getMode()).toBe('cloud');
    expect(manager.getExecutionProvider()).toBe(cloudExecutionProvider);
  });

  it('should switch to local mode when available', async () => {
    (platformUtils.isLocalExecutionSupported as vi.MockedFunction<typeof platformUtils.isLocalExecutionSupported>).mockResolvedValue(true);
    
    await manager.setMode('local');
    
    expect(manager.getMode()).toBe('local');
    expect(manager.getExecutionProvider()).toBe(localExecutionProvider);
  });

  it('should throw error when local mode unavailable', async () => {
    (platformUtils.isLocalExecutionSupported as vi.MockedFunction<typeof platformUtils.isLocalExecutionSupported>).mockResolvedValue(false);
    
    await expect(manager.setMode('local')).rejects.toThrow('Local execution is not available');
    expect(manager.getMode()).toBe('cloud'); // Should remain in cloud mode
  });

  it('should maintain provider state across switches', async () => {
    (platformUtils.isLocalExecutionSupported as vi.MockedFunction<typeof platformUtils.isLocalExecutionSupported>).mockResolvedValue(true);
    
    // Start cloud
    expect(manager.getExecutionProvider()).toBe(cloudExecutionProvider);
    
    // Switch local
    await manager.setMode('local');
    expect(manager.getExecutionProvider()).toBe(localExecutionProvider);
    
    // Switch back
    await manager.setMode('cloud');
    expect(manager.getExecutionProvider()).toBe(cloudExecutionProvider);
  });
  
  it('should manage terminal provider separately', () => {
    const mockTerminalProvider: TerminalProviderInterface = {
      provider: 'cloud',
      name: 'test',
      mode: 'terminal',
      isAvailable: vi.fn(async () => true),
      createSession: vi.fn(async () => ({ sessionId: 't' })),
      destroySession: vi.fn(async () => {}),
      sendInput: vi.fn(async () => {}),
      resize: vi.fn(async () => {}),
      connectStream: vi.fn(() => null),
      disconnectStream: vi.fn(() => {}),
    };
    manager.setTerminalProvider(mockTerminalProvider);
    expect(manager.getTerminalProvider()).toBe(mockTerminalProvider);
  });
});
