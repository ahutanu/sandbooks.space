import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.HOPX_API_KEY = 'test-api-key';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Mock logger to avoid console spam during tests
vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
