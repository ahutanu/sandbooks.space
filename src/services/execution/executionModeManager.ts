import type { ExecutionProviderInterface } from './types';
import type { TerminalProviderInterface } from '../terminal/types';
import { cloudExecutionProvider } from './cloudProvider';
import { localExecutionProvider } from './localProvider';
import { cloudTerminalProvider } from '../terminal/cloudTerminalProvider';
import { isLocalExecutionSupported } from '../../utils/platform';
import type { ExecutionMode } from '../../types';

/**
 * Execution Mode Manager
 * Manages switching between cloud and local execution providers
 * Coordinates execution and terminal providers based on selected mode
 */
export class ExecutionModeManager {
  private executionProvider: ExecutionProviderInterface = cloudExecutionProvider;
  private terminalProvider: TerminalProviderInterface = cloudTerminalProvider;
  private currentMode: ExecutionMode = 'cloud';

  /**
   * Set the execution mode (cloud or local)
   */
  async setMode(mode: ExecutionMode): Promise<void> {
    if (mode === 'local') {
      const available = await isLocalExecutionSupported();
      if (!available) {
        throw new Error('Local execution is not available on this platform');
      }
      this.executionProvider = localExecutionProvider;
      this.terminalProvider = cloudTerminalProvider; // Use cloud terminal for now
    } else {
      this.executionProvider = cloudExecutionProvider;
      this.terminalProvider = cloudTerminalProvider;
    }

    this.currentMode = mode;
  }

  /**
   * Get the current execution provider
   */
  getExecutionProvider(): ExecutionProviderInterface {
    return this.executionProvider;
  }

  /**
   * Set the terminal provider (called separately from execution provider)
   */
  setTerminalProvider(provider: TerminalProviderInterface): void {
    this.terminalProvider = provider;
  }

  /**
   * Get the current terminal provider
   */
  getTerminalProvider(): TerminalProviderInterface | null {
    return this.terminalProvider;
  }

  /**
   * Get the current execution mode
   */
  getMode(): ExecutionMode {
    return this.currentMode;
  }

  /**
   * Check if local mode is available
   */
  async isLocalModeAvailable(): Promise<boolean> {
    return await isLocalExecutionSupported();
  }
}

export const executionModeManager = new ExecutionModeManager();

