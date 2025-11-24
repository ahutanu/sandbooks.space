/**
 * Terminal Service and Providers
 * 
 * Barrel export for terminal service and providers
 */

// Re-export terminal service (from parent directory)
export { terminalService } from '../terminal';

// Export terminal providers
export { cloudTerminalProvider } from './cloudTerminalProvider';
export { localTerminalProvider } from './localTerminalProvider';
export type { TerminalProviderInterface } from './types';

