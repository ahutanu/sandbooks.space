import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { sendSSE, setupSSE, sendHeartbeat } from './sse';

describe('sse', () => {
  let mockResponse: Partial<Response>;
  let writeSpy: ReturnType<typeof vi.fn>;
  let setHeaderSpy: ReturnType<typeof vi.fn>;
  let flushHeadersSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeSpy = vi.fn();
    setHeaderSpy = vi.fn();
    flushHeadersSpy = vi.fn();

    mockResponse = {
      write: writeSpy,
      setHeader: setHeaderSpy,
      flushHeaders: flushHeadersSpy,
    };
  });

  describe('sendSSE', () => {
    it('sends SSE event with proper format', () => {
      const data = { message: 'test' };
      sendSSE(mockResponse as Response, 'test-event', data);

      expect(writeSpy).toHaveBeenCalledWith(
        'event: test-event\ndata: {"message":"test"}\n\n'
      );
    });

    it('formats event type correctly', () => {
      sendSSE(mockResponse as Response, 'output', { text: 'hello' });

      expect(writeSpy).toHaveBeenCalledWith(
        'event: output\ndata: {"text":"hello"}\n\n'
      );
    });

    it('handles null data', () => {
      sendSSE(mockResponse as Response, 'end', null);

      expect(writeSpy).toHaveBeenCalledWith('event: end\ndata: null\n\n');
    });

    it('handles undefined data', () => {
      sendSSE(mockResponse as Response, 'end', undefined);

      // JSON.stringify(undefined) returns undefined
      expect(writeSpy).toHaveBeenCalledWith('event: end\ndata: undefined\n\n');
    });

    it('handles array data', () => {
      const data = [1, 2, 3];
      sendSSE(mockResponse as Response, 'data', data);

      expect(writeSpy).toHaveBeenCalledWith('event: data\ndata: [1,2,3]\n\n');
    });

    it('handles string data', () => {
      sendSSE(mockResponse as Response, 'message', 'Hello World');

      expect(writeSpy).toHaveBeenCalledWith(
        'event: message\ndata: "Hello World"\n\n'
      );
    });

    it('handles number data', () => {
      sendSSE(mockResponse as Response, 'count', 42);

      expect(writeSpy).toHaveBeenCalledWith('event: count\ndata: 42\n\n');
    });

    it('handles boolean data', () => {
      sendSSE(mockResponse as Response, 'status', true);

      expect(writeSpy).toHaveBeenCalledWith('event: status\ndata: true\n\n');
    });

    it('handles complex nested objects', () => {
      const data = {
        nested: {
          deep: {
            value: 123,
            array: [1, 2, 3],
          },
        },
      };
      sendSSE(mockResponse as Response, 'complex', data);

      const expectedData = JSON.stringify(data);
      expect(writeSpy).toHaveBeenCalledWith(
        `event: complex\ndata: ${expectedData}\n\n`
      );
    });

    it('throws error when JSON.stringify fails', () => {
      const circularData: Record<string, unknown> = { a: 1 };
      circularData.self = circularData;

      expect(() => {
        sendSSE(mockResponse as Response, 'error', circularData);
      }).toThrow();
    });

    it('handles empty object', () => {
      sendSSE(mockResponse as Response, 'empty', {});

      expect(writeSpy).toHaveBeenCalledWith('event: empty\ndata: {}\n\n');
    });

    it('handles empty array', () => {
      sendSSE(mockResponse as Response, 'empty', []);

      expect(writeSpy).toHaveBeenCalledWith('event: empty\ndata: []\n\n');
    });

    it('handles special characters in event type', () => {
      sendSSE(mockResponse as Response, 'test-event_123', { data: 'test' });

      expect(writeSpy).toHaveBeenCalledWith(
        'event: test-event_123\ndata: {"data":"test"}\n\n'
      );
    });

    it('handles special characters in data', () => {
      const data = { message: 'Test\n\t"quotes"' };
      sendSSE(mockResponse as Response, 'test', data);

      expect(writeSpy).toHaveBeenCalledWith(
        'event: test\ndata: {"message":"Test\\n\\t\\"quotes\\""}\n\n'
      );
    });

    it('throws when response.write throws', () => {
      writeSpy.mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => {
        sendSSE(mockResponse as Response, 'test', {});
      }).toThrow('Write error');
    });
  });

  describe('setupSSE', () => {
    it('sets correct Content-Type header', () => {
      setupSSE(mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      );
    });

    it('sets Cache-Control to no-cache', () => {
      setupSSE(mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    });

    it('sets Connection to keep-alive', () => {
      setupSSE(mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith('Connection', 'keep-alive');
    });

    it('sets X-Accel-Buffering to no', () => {
      setupSSE(mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    });

    it('calls flushHeaders', () => {
      setupSSE(mockResponse as Response);

      expect(flushHeadersSpy).toHaveBeenCalled();
    });

    it('sets all headers before flushing', () => {
      const callOrder: string[] = [];

      setHeaderSpy.mockImplementation((header: string) => {
        callOrder.push(`setHeader:${header}`);
      });

      flushHeadersSpy.mockImplementation(() => {
        callOrder.push('flushHeaders');
      });

      setupSSE(mockResponse as Response);

      expect(callOrder).toEqual([
        'setHeader:Content-Type',
        'setHeader:Cache-Control',
        'setHeader:Connection',
        'setHeader:X-Accel-Buffering',
        'flushHeaders',
      ]);
    });

    it('sets exactly 4 headers', () => {
      setupSSE(mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('sendHeartbeat', () => {
    it('sends heartbeat event', () => {
      const beforeTime = Date.now();
      sendHeartbeat(mockResponse as Response);
      const afterTime = Date.now();

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const call = writeSpy.mock.calls[0][0];
      expect(call).toContain('event: heartbeat');
      expect(call).toContain('data: ');

      // Extract timestamp from the call
      const match = call.match(/data: \{"timestamp":(\d+)\}/);
      expect(match).toBeTruthy();
      const timestamp = parseInt(match![1], 10);

      // Verify timestamp is within reasonable range
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('uses sendSSE internally', () => {
      const originalWrite = writeSpy;
      sendHeartbeat(mockResponse as Response);

      // Verify format matches sendSSE output
      const call = originalWrite.mock.calls[0][0];
      expect(call).toMatch(/^event: heartbeat\ndata: \{.*\}\n\n$/);
    });

    it('includes timestamp in data', () => {
      sendHeartbeat(mockResponse as Response);

      const call = writeSpy.mock.calls[0][0];
      expect(call).toContain('"timestamp"');
    });
  });

  describe('integration', () => {
    it('setupSSE followed by sendSSE works correctly', () => {
      setupSSE(mockResponse as Response);
      sendSSE(mockResponse as Response, 'test', { data: 'value' });

      expect(setHeaderSpy).toHaveBeenCalledTimes(4);
      expect(flushHeadersSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalledWith(
        'event: test\ndata: {"data":"value"}\n\n'
      );
    });

    it('multiple sendSSE calls work correctly', () => {
      sendSSE(mockResponse as Response, 'event1', { msg: 'first' });
      sendSSE(mockResponse as Response, 'event2', { msg: 'second' });
      sendSSE(mockResponse as Response, 'event3', { msg: 'third' });

      expect(writeSpy).toHaveBeenCalledTimes(3);
      expect(writeSpy).toHaveBeenNthCalledWith(
        1,
        'event: event1\ndata: {"msg":"first"}\n\n'
      );
      expect(writeSpy).toHaveBeenNthCalledWith(
        2,
        'event: event2\ndata: {"msg":"second"}\n\n'
      );
      expect(writeSpy).toHaveBeenNthCalledWith(
        3,
        'event: event3\ndata: {"msg":"third"}\n\n'
      );
    });
  });
});
