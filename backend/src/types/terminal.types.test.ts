import { describe, expect, it } from 'vitest';
import {
  CommandExecutionError,
  SessionDestroyedError,
  SessionNotFoundError,
  SSEConnectionError,
  TerminalError
} from './terminal.types';

describe('terminal error classes', () => {
  it('builds TerminalError with defaults', () => {
    const err = new TerminalError(500, 'base message');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('base message');
    expect(err.isOperational).toBe(true);
  });

  it('sets specialized error metadata', () => {
    const notFound = new SessionNotFoundError('abc');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.message).toContain('abc');

    const destroyed = new SessionDestroyedError('def');
    expect(destroyed.statusCode).toBe(410);
    expect(destroyed.message).toContain('def');

    const commandError = new CommandExecutionError('boom', 502);
    expect(commandError.statusCode).toBe(502);
    expect(commandError.message).toContain('boom');

    const sseError = new SSEConnectionError('stream broke');
    expect(sseError.statusCode).toBe(500);
    expect(sseError.message).toContain('stream broke');
  });
});
