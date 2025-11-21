import { describe, it, expect } from 'vitest';
import { getErrorMessage, getErrorCode } from './errorUtils';

describe('errorUtils', () => {
  describe('getErrorMessage', () => {
    it('returns message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('returns string error directly', () => {
      const error = 'String error message';
      expect(getErrorMessage(error)).toBe('String error message');
    });

    it('returns JSON string for plain objects', () => {
      const error = { message: 'Object error', code: 500 };
      const result = getErrorMessage(error);
      expect(result).toBe(JSON.stringify(error));
    });

    it('returns JSON string for arrays', () => {
      const error = ['error1', 'error2'];
      expect(getErrorMessage(error)).toBe(JSON.stringify(error));
    });

    it('returns JSON string for numbers', () => {
      const error = 404;
      expect(getErrorMessage(error)).toBe('404');
    });

    it('returns JSON string for booleans', () => {
      const error = false;
      expect(getErrorMessage(error)).toBe('false');
    });

    it('returns JSON string for null', () => {
      const error = null;
      expect(getErrorMessage(error)).toBe('null');
    });

    it('returns "Unknown error" for circular references', () => {
      const error: Record<string, unknown> = { message: 'Circular' };
      error.self = error; // Create circular reference
      expect(getErrorMessage(error)).toBe('Unknown error');
    });

    it('returns undefined for undefined', () => {
      const error = undefined;
      // JSON.stringify(undefined) returns undefined, not string
      expect(getErrorMessage(error)).toBeUndefined();
    });

    it('handles TypeError instances', () => {
      const error = new TypeError('Type error message');
      expect(getErrorMessage(error)).toBe('Type error message');
    });

    it('handles RangeError instances', () => {
      const error = new RangeError('Range error message');
      expect(getErrorMessage(error)).toBe('Range error message');
    });

    it('handles custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('handles empty string', () => {
      const error = '';
      expect(getErrorMessage(error)).toBe('');
    });

    it('handles objects with toJSON method', () => {
      const error = {
        message: 'Test',
        toJSON() {
          return { formatted: 'error' };
        },
      };
      expect(getErrorMessage(error)).toBe(JSON.stringify({ formatted: 'error' }));
    });
  });

  describe('getErrorCode', () => {
    it('returns code from object with string code property', () => {
      const error = { code: 'ERR_CONNECTION_REFUSED' };
      expect(getErrorCode(error)).toBe('ERR_CONNECTION_REFUSED');
    });

    it('returns undefined for Error without code', () => {
      const error = new Error('Test error');
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for string error', () => {
      const error = 'String error';
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for null', () => {
      const error = null;
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      const error = undefined;
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for number', () => {
      const error = 404;
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined when code is not a string', () => {
      const error = { code: 404 };
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined when code is null', () => {
      const error = { code: null };
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns undefined when code is undefined', () => {
      const error = { code: undefined };
      expect(getErrorCode(error)).toBeUndefined();
    });

    it('returns code from Error-like object', () => {
      const error = {
        message: 'ECONNREFUSED',
        code: 'ECONNREFUSED',
      };
      expect(getErrorCode(error)).toBe('ECONNREFUSED');
    });

    it('handles Node.js system errors', () => {
      const error = {
        errno: -61,
        code: 'ECONNREFUSED',
        syscall: 'connect',
      };
      expect(getErrorCode(error)).toBe('ECONNREFUSED');
    });

    it('returns code when object has other properties', () => {
      const error = {
        message: 'Error message',
        code: 'ERR_TIMEOUT',
        stack: 'stack trace',
        otherProp: 'value',
      };
      expect(getErrorCode(error)).toBe('ERR_TIMEOUT');
    });

    it('handles empty string code', () => {
      const error = { code: '' };
      expect(getErrorCode(error)).toBe('');
    });
  });
});
