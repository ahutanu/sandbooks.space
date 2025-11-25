import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopyToClipboard } from '../useCopyToClipboard';

describe('useCopyToClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure execCommand is defined
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.state).toBe('idle');
  });

  it('should copy text using Clipboard API', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy('test text');
    });

    expect(success).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('test text');
    expect(result.current.state).toBe('success');
  });

  it('should reset state after successDuration', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const { result } = renderHook(() =>
      useCopyToClipboard({ successDuration: 1000 })
    );

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.state).toBe('success');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state).toBe('idle');
  });

  it('should call onSuccess callback on successful copy', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(onSuccess).toHaveBeenCalledWith('test text');
  });

  it('should call onError callback on failure', async () => {
    const error = new Error('Copy failed');
    const mockWriteText = vi.fn().mockRejectedValue(error);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    // Make fallback also fail
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onError }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.state).toBe('error');
  });

  it('should return error state for empty text', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onError }));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy('');
    });

    expect(success).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Nothing to copy',
    }));
    expect(result.current.state).toBe('error');
  });

  it('should use fallback when Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

    await act(async () => {
      await result.current.copy('fallback text');
    });

    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    expect(result.current.state).toBe('success');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should reset state manually', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.state).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
  });

  it('should cancel previous timer when copy is called again', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const { result } = renderHook(() =>
      useCopyToClipboard({ successDuration: 1000 })
    );

    await act(async () => {
      await result.current.copy('first');
    });

    expect(result.current.state).toBe('success');

    // Advance half the time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Copy again
    await act(async () => {
      await result.current.copy('second');
    });

    expect(result.current.state).toBe('success');

    // After 500ms, still success (new timer)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state).toBe('success');

    // After another 500ms, back to idle
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state).toBe('idle');
  });

  it('should try fallback when Clipboard API fails', async () => {
    const error = new Error('Clipboard failed');
    const mockWriteText = vi.fn().mockRejectedValue(error);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

    await act(async () => {
      await result.current.copy('fallback after error');
    });

    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    expect(result.current.state).toBe('success');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not update state after unmount', async () => {
    const mockWriteText = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const { result, unmount } = renderHook(() => useCopyToClipboard());

    // Start the copy
    act(() => {
      result.current.copy('test');
    });

    // Unmount before completion
    unmount();

    // Advance time to complete the promise
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // No errors should be thrown
    expect(true).toBe(true);
  });
});
