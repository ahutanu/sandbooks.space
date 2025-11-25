import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hopxService } from '../hopx';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

vi.mock('../../utils/fetchWithTimeout');

const mockFetchWithTimeout = fetchWithTimeout as unknown as ReturnType<typeof vi.fn>;

describe('HopxService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute code successfully', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                stdout: 'Hello',
                stderr: '',
                exitCode: 0,
                executionTime: 100,
                sandboxStatus: 'healthy',
                richOutputs: []
            })
        };
        mockFetchWithTimeout.mockResolvedValue(mockResponse as Response);

        const result = await hopxService.executeCode('print("Hello")', 'python');

        expect(result.stdout).toBe('Hello');
        expect(result.exitCode).toBe(0);
        expect(result.sandboxStatus).toBe('healthy');
        // fetchWithTimeout is called with (url, options, timeout)
        expect(fetchWithTimeout).toHaveBeenCalledWith(
            expect.stringContaining('/api/execute'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ code: 'print("Hello")', language: 'python' })
            }),
            expect.any(Number) // timeout
        );
    });

    it('should handle API errors (non-200 response)', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Execution failed' })
        };
        mockFetchWithTimeout.mockResolvedValue(mockResponse as Response);

        const result = await hopxService.executeCode('bad code', 'python');

        expect(result.error).toBe('Execution failed');
        expect(result.sandboxStatus).toBe('unhealthy');
        expect(result.exitCode).toBe(1);
    });

    it('should handle API errors with default message', async () => {
        const mockResponse = {
            ok: false,
            status: 503,
            json: async () => ({})
        };
        mockFetchWithTimeout.mockResolvedValue(mockResponse as Response);

        const result = await hopxService.executeCode('code', 'python');

        expect(result.error).toContain('Request failed with status 503');
        expect(result.sandboxStatus).toBe('unhealthy');
    });

    it('should handle network errors', async () => {
        mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

        const result = await hopxService.executeCode('code', 'python');

        expect(result.error).toBe('Network error');
        expect(result.sandboxStatus).toBe('unhealthy');
        expect(result.exitCode).toBe(1);
    });

    it('should handle network errors (non-Error object)', async () => {
        mockFetchWithTimeout.mockRejectedValue('Unknown error');

        const result = await hopxService.executeCode('code', 'python');

        expect(result.error).toBe('Failed to connect to backend');
        expect(result.sandboxStatus).toBe('unhealthy');
    });
});
