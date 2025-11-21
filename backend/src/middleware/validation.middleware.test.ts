import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from './validation.middleware';
import { ValidationError } from '../utils/errors';

describe('validation.middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  describe('validateRequest', () => {
    const simpleSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('calls next() when validation passes', () => {
      mockReq.body = {
        name: 'John',
        age: 30,
      };

      const middleware = validateRequest(simpleSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('passes ValidationError to next() when validation fails', () => {
      mockReq.body = {
        name: 'John',
        age: 'not a number',
      };

      const middleware = validateRequest(simpleSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
    });

    it('formats single validation error message', () => {
      mockReq.body = {
        name: 'John',
      };

      const middleware = validateRequest(simpleSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('age');
      expect(error.message).toContain('Required');
    });

    it('formats multiple validation errors', () => {
      mockReq.body = {};

      const middleware = validateRequest(simpleSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('name');
      expect(error.message).toContain('age');
    });

    it('includes field path in error message', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string().email(),
          }),
        }),
      });

      mockReq.body = {
        user: {
          profile: {
            email: 'invalid-email',
          },
        },
      };

      const middleware = validateRequest(nestedSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('user.profile.email');
    });

    it('validates string fields correctly', () => {
      const schema = z.object({
        text: z.string().min(3),
      });

      mockReq.body = { text: 'ab' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates number fields correctly', () => {
      const schema = z.object({
        count: z.number().positive(),
      });

      mockReq.body = { count: -5 };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates boolean fields correctly', () => {
      const schema = z.object({
        active: z.boolean(),
      });

      mockReq.body = { active: 'true' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates array fields correctly', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1),
      });

      mockReq.body = { tags: [] };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates optional fields correctly', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      mockReq.body = { required: 'value' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('validates enum fields correctly', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive']),
      });

      mockReq.body = { status: 'pending' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates union types correctly', () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      mockReq.body = { value: true };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('handles empty request body', () => {
      const schema = z.object({
        name: z.string(),
      });

      mockReq.body = undefined;

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('handles null request body', () => {
      const schema = z.object({
        name: z.string(),
      });

      mockReq.body = null;

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates nested objects correctly', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      });

      mockReq.body = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
      };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('rejects extra fields with strict schema', () => {
      const schema = z.object({
        name: z.string(),
      }).strict();

      mockReq.body = {
        name: 'John',
        extra: 'field',
      };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('allows extra fields without strict schema', () => {
      const schema = z.object({
        name: z.string(),
      });

      mockReq.body = {
        name: 'John',
        extra: 'field',
      };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('validates email format', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      mockReq.body = { email: 'not-an-email' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('email');
    });

    it('validates URL format', () => {
      const schema = z.object({
        url: z.string().url(),
      });

      mockReq.body = { url: 'not-a-url' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('validates custom refinements', () => {
      const schema = z.object({
        password: z.string().refine(val => val.length >= 8, {
          message: 'Password must be at least 8 characters',
        }),
      });

      mockReq.body = { password: 'short' };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('Password must be at least 8 characters');
    });

    it('passes through non-Zod errors', () => {
      const schema = {
        parse: () => {
          throw new Error('Non-Zod error');
        },
      } as unknown as z.ZodSchema;

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error).not.toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Non-Zod error');
    });

    it('handles array of objects validation', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
          })
        ),
      });

      mockReq.body = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('validates array of objects with error', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
          })
        ),
      });

      mockReq.body = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 'invalid', name: 'Item 2' },
        ],
      };

      const middleware = validateRequest(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = (mockNext as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error.message).toContain('items.1.id');
    });
  });
});
