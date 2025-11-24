/**
 * Terminal Service and Providers
 *
 * Cloud-only terminal (Hopx sandboxes)
 * Local terminal requires desktop app or browser extension
 */

// Re-export terminal service (from parent directory)
export { terminalService } from '../terminal';

// Export terminal provider (cloud-only)
export { cloudTerminalProvider } from './cloudTerminalProvider';
export type { TerminalProviderInterface } from './types';

