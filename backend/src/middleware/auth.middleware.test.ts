import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authGuard } from './auth.middleware';
import env from '../config/env';

describe('auth.middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let originalToken: string | undefined;

  beforeEach(() => {
    originalToken = env.API_ACCESS_TOKEN;
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => mockRes);

    mockReq = {
      method: 'GET',
      path: '/api/execute',
      headers: {},
      query: {},
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    env.API_ACCESS_TOKEN = originalToken;
  });

  describe('OPTIONS requests', () => {
    it('always allows OPTIONS requests', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.method = 'OPTIONS';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('bypasses auth for OPTIONS even with missing token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.method = 'OPTIONS';
      mockReq.headers = {};

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(jsonSpy).not.toHaveBeenCalled();
    });
  });

  describe('public health endpoints', () => {
    it('allows /api/health without token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.path = '/api/health';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('allows /api/sandbox/health without token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.path = '/api/sandbox/health';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('allows root path without token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.path = '/';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('is case-insensitive for health paths', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.path = '/API/HEALTH';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('allows paths containing sandbox/health', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.path = '/api/v1/sandbox/health/status';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('no token configured', () => {
    it('allows all requests when API_ACCESS_TOKEN not set', () => {
      env.API_ACCESS_TOKEN = undefined;
      mockReq.path = '/api/execute';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('allows requests without headers when no token configured', () => {
      env.API_ACCESS_TOKEN = undefined;
      mockReq.headers = {};
      mockReq.path = '/api/terminal/sessions';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Bearer token authentication', () => {
    it('accepts valid Bearer token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Bearer secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid Bearer token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Bearer wrong-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Unauthorized: invalid or missing API token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rejects Bearer with empty token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Bearer ',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('handles authorization header that is not a string', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: ['Bearer', 'secret-token'] as unknown as string,
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });
  });

  describe('x-sandbooks-token header authentication', () => {
    it('accepts valid x-sandbooks-token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        'x-sandbooks-token': 'secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid x-sandbooks-token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        'x-sandbooks-token': 'wrong-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('handles x-sandbooks-token as array (takes first)', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        'x-sandbooks-token': ['secret-token', 'other-token'] as unknown as string,
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('rejects when first token in array is invalid', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        'x-sandbooks-token': ['wrong-token', 'secret-token'] as unknown as string,
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });
  });

  describe('query parameter authentication', () => {
    it('accepts valid token in query string', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.query = {
        token: 'secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('rejects invalid token in query string', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.query = {
        token: 'wrong-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('ignores non-string query token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.query = {
        token: ['secret-token', 'other'] as unknown as string,
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });
  });

  describe('token priority', () => {
    it('prefers Bearer token over x-sandbooks-token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Bearer secret-token',
        'x-sandbooks-token': 'wrong-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('falls back to x-sandbooks-token if Bearer not valid', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Basic wrong-format',
        'x-sandbooks-token': 'secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('falls back to query token if headers not valid', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.query = {
        token: 'secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('missing token', () => {
    it('rejects request with no token when required', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {};
      mockReq.query = {};
      mockReq.path = '/api/execute';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Unauthorized: invalid or missing API token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rejects empty authorization header', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: '',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });
  });

  describe('edge cases', () => {
    it('rejects when no authorization provided', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {};
      mockReq.query = {};
      mockReq.path = '/api/execute';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('rejects when query is empty', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {};
      mockReq.query = {};
      mockReq.path = '/api/execute';

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('rejects non-Bearer authorization schemes', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Basic secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('is case-sensitive for token value', () => {
      env.API_ACCESS_TOKEN = 'Secret-Token';
      mockReq.headers = {
        authorization: 'Bearer secret-token',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('handles whitespace in Bearer token', () => {
      env.API_ACCESS_TOKEN = 'secret-token';
      mockReq.headers = {
        authorization: 'Bearer  secret-token ',
      };

      authGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });
  });
});
