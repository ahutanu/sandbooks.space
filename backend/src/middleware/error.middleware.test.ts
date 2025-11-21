import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from './error.middleware';
import { AppError, ValidationError, HopxError } from '../utils/errors';
import { TerminalError } from '../types/terminal.types';

describe('error.middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => mockRes);

    mockReq = {
      path: '/api/test',
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  describe('errorHandler', () => {
    describe('TerminalError handling', () => {
      it('returns proper response for TerminalError', () => {
        const error = new TerminalError(404, 'Session not found');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(404);
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Session not found',
          statusCode: 404,
        });
      });

      it('uses TerminalError statusCode', () => {
        const error = new TerminalError(500, 'Terminal error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(500);
      });

      it('does not include sandbox status for TerminalError', () => {
        const error = new TerminalError(404, 'Not found');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        const response = jsonSpy.mock.calls[0][0];
        expect(response).not.toHaveProperty('sandboxStatus');
        expect(response).not.toHaveProperty('recoverable');
      });
    });

    describe('AppError handling', () => {
      it('returns proper response for AppError', () => {
        const error = new AppError(400, 'Bad request');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Bad request',
          statusCode: 400,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        });
      });

      it('handles ValidationError', () => {
        const error = new ValidationError('Invalid input');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Invalid input',
          statusCode: 400,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        });
      });

      it('handles HopxError', () => {
        const error = new HopxError('API failed', 502);

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(502);
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Hopx API Error: API failed',
          statusCode: 502,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        });
      });

      it('includes sandboxStatus and recoverable for AppError', () => {
        const error = new AppError(500, 'Server error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        const response = jsonSpy.mock.calls[0][0];
        expect(response.sandboxStatus).toBe('unhealthy');
        expect(response.recoverable).toBe(true);
      });
    });

    describe('generic Error handling', () => {
      it('returns 500 for generic Error', () => {
        const error = new Error('Something went wrong');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          error: 'Something went wrong', // In test env, shows actual message
          statusCode: 500,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        });
      });

      it('includes sandboxStatus and recoverable for generic errors', () => {
        const error = new Error('Test error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        const response = jsonSpy.mock.calls[0][0];
        expect(response.sandboxStatus).toBe('unhealthy');
        expect(response.recoverable).toBe(true);
      });
    });

    describe('error priority', () => {
      it('treats TerminalError before AppError', () => {
        // TerminalError extends Error, not AppError
        const error = new TerminalError(404, 'Session not found');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        const response = jsonSpy.mock.calls[0][0];
        expect(response).not.toHaveProperty('sandboxStatus');
      });

      it('treats AppError subclasses as AppError', () => {
        const error = new ValidationError('Invalid');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        const response = jsonSpy.mock.calls[0][0];
        expect(response).toHaveProperty('sandboxStatus');
        expect(response).toHaveProperty('recoverable');
      });
    });

    describe('edge cases', () => {
      it('handles Error with empty message', () => {
        const error = new Error('');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalled();
      });

      it('handles AppError with custom statusCode', () => {
        const error = new AppError(418, "I'm a teapot");

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(418);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 418,
            error: "I'm a teapot",
          })
        );
      });

      it('handles different request paths', () => {
        mockReq.path = '/api/terminal/sessions/abc123';
        const error = new Error('Test');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(statusSpy).toHaveBeenCalledWith(500);
      });

      it('does not call next function', () => {
        const error = new Error('Test');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('notFoundHandler', () => {
    it('returns 404 status', () => {
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
    });

    it('includes request method and path in error message', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/unknown';

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Route POST /api/unknown not found',
        statusCode: 404,
      });
    });

    it('handles different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        mockReq.method = method;
        mockReq.path = '/api/test';

        notFoundHandler(mockReq as Request, mockRes as Response);

        expect(jsonSpy).toHaveBeenCalledWith({
          error: `Route ${method} /api/test not found`,
          statusCode: 404,
        });
      });
    });

    it('handles root path', () => {
      mockReq.method = 'GET';
      mockReq.path = '/';

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Route GET / not found',
        statusCode: 404,
      });
    });

    it('handles paths with query parameters notation', () => {
      mockReq.method = 'GET';
      mockReq.path = '/api/users';

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Route GET /api/users not found',
        statusCode: 404,
      });
    });

    it('does not call next', () => {
      // notFoundHandler doesn't have a next parameter, but ensuring it completes
      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(statusSpy).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalled();
    });
  });
});
