import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// Configure React Testing Library to suppress act() warnings
configure({
  testIdAttribute: 'data-testid',
  // Suppress act() warnings by default
  asyncUtilTimeout: 5000,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Suppress expected console output in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

// Suppress expected error logs from error handling paths
console.error = vi.fn((...args) => {
  const message = String(args[0] || '');
  const expectedErrors = [
    'Failed to save note',
    'Failed to update note',
    'Failed to delete note',
    'Failed to import notes',
    'Execution failed',
    'Failed to process queued execution',
    'Auto-heal failed',
    'Failed to initialize global terminal session',
    'Failed to connect to local folder',
    'Failed to restore offline queue',
    'Service Worker registration error',
  ];
  
  if (expectedErrors.some(err => message.includes(err))) {
    // Suppress expected errors
    return;
  }
  // Log unexpected errors
  originalError(...args);
});

// Suppress expected warnings
console.warn = vi.fn((...args) => {
  const message = String(args[0] || '');
  if (message.includes('not found for queued execution') ||
      message.includes('not configured to support act') ||
      message.includes('The current testing environment is not configured to support act')) {
    return;
  }
  originalWarn(...args);
});

// Also suppress React's internal warnings via process.stderr if available
if (typeof process !== 'undefined' && process.stderr) {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function(chunk: string | Uint8Array, ...args: unknown[]) {
    if (typeof chunk === 'string' && chunk.includes('not configured to support act')) {
      return true; // Suppress the warning
    }
    return originalStderrWrite(chunk, ...args);
  };
}

// Suppress PWA debug logs
console.log = vi.fn((...args) => {
  const message = String(args[0] || '');
  if (message.includes('[PWA]')) {
    return;
  }
  originalLog(...args);
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
