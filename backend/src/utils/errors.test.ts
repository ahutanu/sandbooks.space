import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  ExecutionError,
  TimeoutError,
  HopxError,
} from './errors';

describe('errors', () => {
  describe('AppError', () => {
    it('creates error with statusCode and message', () => {
      const error = new AppError(500, 'Internal error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal error');
      expect(error.isOperational).toBe(true);
    });

    it('sets isOperational to custom value', () => {
      const error = new AppError(500, 'Internal error', false);

      expect(error.isOperational).toBe(false);
    });

    it('defaults isOperational to true', () => {
      const error = new AppError(404, 'Not found');

      expect(error.isOperational).toBe(true);
    });

    it('has proper Error properties', () => {
      const error = new AppError(500, 'Test error');

      expect(error.name).toBe('Error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Error');
    });

    it('maintains prototype chain', () => {
      const error = new AppError(500, 'Test');

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });

    it('is catchable as Error', () => {
      try {
        throw new AppError(500, 'Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it('handles different status codes', () => {
      expect(new AppError(400, 'Bad request').statusCode).toBe(400);
      expect(new AppError(401, 'Unauthorized').statusCode).toBe(401);
      expect(new AppError(403, 'Forbidden').statusCode).toBe(403);
      expect(new AppError(404, 'Not found').statusCode).toBe(404);
      expect(new AppError(500, 'Server error').statusCode).toBe(500);
      expect(new AppError(502, 'Bad gateway').statusCode).toBe(502);
    });

    it('handles empty message', () => {
      const error = new AppError(500, '');

      expect(error.message).toBe('');
    });

    it('handles multiline message', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      const error = new AppError(500, message);

      expect(error.message).toBe(message);
    });
  });

  describe('ValidationError', () => {
    it('creates error with 400 status code', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.isOperational).toBe(true);
    });

    it('maintains proper prototype chain', () => {
      const error = new ValidationError('Test');

      expect(Object.getPrototypeOf(error)).toBe(ValidationError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
        AppError.prototype
      );
    });

    it('has stack trace', () => {
      const error = new ValidationError('Validation failed');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });

    it('handles different validation messages', () => {
      expect(new ValidationError('Missing field').message).toBe('Missing field');
      expect(new ValidationError('Invalid email').message).toBe('Invalid email');
      expect(new ValidationError('Field required').message).toBe('Field required');
    });
  });

  describe('ExecutionError', () => {
    it('creates error with 500 status code', () => {
      const error = new ExecutionError('Execution failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ExecutionError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Execution failed');
      expect(error.isOperational).toBe(true);
    });

    it('maintains proper prototype chain', () => {
      const error = new ExecutionError('Test');

      expect(Object.getPrototypeOf(error)).toBe(ExecutionError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
        AppError.prototype
      );
    });

    it('has stack trace', () => {
      const error = new ExecutionError('Runtime error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ExecutionError');
    });

    it('handles different execution error messages', () => {
      expect(new ExecutionError('Syntax error').message).toBe('Syntax error');
      expect(new ExecutionError('Runtime error').message).toBe('Runtime error');
      expect(new ExecutionError('Out of memory').message).toBe('Out of memory');
    });
  });

  describe('TimeoutError', () => {
    it('creates error with 408 status code and default message', () => {
      const error = new TimeoutError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.statusCode).toBe(408);
      expect(error.message).toBe('Code execution timeout');
      expect(error.isOperational).toBe(true);
    });

    it('creates error with custom message', () => {
      const error = new TimeoutError('Custom timeout message');

      expect(error.statusCode).toBe(408);
      expect(error.message).toBe('Custom timeout message');
    });

    it('maintains proper prototype chain', () => {
      const error = new TimeoutError();

      expect(Object.getPrototypeOf(error)).toBe(TimeoutError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
        AppError.prototype
      );
    });

    it('has stack trace', () => {
      const error = new TimeoutError();

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TimeoutError');
    });

    it('handles empty string message', () => {
      const error = new TimeoutError('');

      expect(error.message).toBe('');
    });
  });

  describe('HopxError', () => {
    it('creates error with 502 status code by default', () => {
      const error = new HopxError('API failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(HopxError);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Hopx API Error: API failed');
      expect(error.isOperational).toBe(true);
    });

    it('prefixes message with "Hopx API Error:"', () => {
      const error = new HopxError('Connection refused');

      expect(error.message).toBe('Hopx API Error: Connection refused');
    });

    it('accepts custom status code', () => {
      const error = new HopxError('Unauthorized', 401);

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Hopx API Error: Unauthorized');
    });

    it('maintains proper prototype chain', () => {
      const error = new HopxError('Test');

      expect(Object.getPrototypeOf(error)).toBe(HopxError.prototype);
      expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(
        AppError.prototype
      );
    });

    it('has stack trace', () => {
      const error = new HopxError('API Error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('HopxError');
    });

    it('handles different status codes', () => {
      expect(new HopxError('Bad request', 400).statusCode).toBe(400);
      expect(new HopxError('Not found', 404).statusCode).toBe(404);
      expect(new HopxError('Server error', 500).statusCode).toBe(500);
      expect(new HopxError('Bad gateway', 502).statusCode).toBe(502);
      expect(new HopxError('Timeout', 504).statusCode).toBe(504);
    });

    it('handles empty message with prefix', () => {
      const error = new HopxError('');

      expect(error.message).toBe('Hopx API Error: ');
    });
  });

  describe('error inheritance', () => {
    it('ValidationError is instanceof AppError', () => {
      const error = new ValidationError('Test');

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('ExecutionError is instanceof AppError', () => {
      const error = new ExecutionError('Test');

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('TimeoutError is instanceof AppError', () => {
      const error = new TimeoutError();

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('HopxError is instanceof AppError', () => {
      const error = new HopxError('Test');

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('errors are distinguishable by instanceof', () => {
      const validation = new ValidationError('Test');
      const execution = new ExecutionError('Test');
      const timeout = new TimeoutError();
      const hopx = new HopxError('Test');

      expect(validation instanceof ValidationError).toBe(true);
      expect(validation instanceof ExecutionError).toBe(false);
      expect(validation instanceof TimeoutError).toBe(false);
      expect(validation instanceof HopxError).toBe(false);

      expect(execution instanceof ValidationError).toBe(false);
      expect(execution instanceof ExecutionError).toBe(true);

      expect(timeout instanceof TimeoutError).toBe(true);
      expect(timeout instanceof HopxError).toBe(false);

      expect(hopx instanceof HopxError).toBe(true);
      expect(hopx instanceof ValidationError).toBe(false);
    });
  });

  describe('error throwing and catching', () => {
    it('can catch specific error types', () => {
      try {
        throw new ValidationError('Invalid');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.statusCode).toBe(400);
          expect(error.message).toBe('Invalid');
        } else {
          throw new Error('Should have caught ValidationError');
        }
      }
    });

    it('can catch as AppError', () => {
      try {
        throw new ExecutionError('Failed');
      } catch (error) {
        if (error instanceof AppError) {
          expect(error.isOperational).toBe(true);
        } else {
          throw new Error('Should have caught as AppError');
        }
      }
    });

    it('can catch as generic Error', () => {
      try {
        throw new HopxError('API Error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
