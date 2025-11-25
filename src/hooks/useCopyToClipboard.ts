import { useState, useCallback, useRef, useEffect } from 'react';

export type CopyState = 'idle' | 'success' | 'error';

export interface UseCopyToClipboardOptions {
  /** Duration to show success state (ms), default 1500 */
  successDuration?: number;
  /** Callback after successful copy */
  onSuccess?: (text: string) => void;
  /** Callback after failed copy */
  onError?: (error: Error) => void;
}

export interface UseCopyToClipboardReturn {
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Current copy state */
  state: CopyState;
  /** Reset state to idle */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with managed state
 *
 * Features:
 * - Auto-reset state after success duration
 * - Fallback to execCommand for older browsers
 * - Proper cleanup on unmount
 */
export const useCopyToClipboard = (
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn => {
  const { successDuration = 1500, onSuccess, onError } = options;

  const [state, setState] = useState<CopyState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState('idle');
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Validate input
    if (!text) {
      const error = new Error('Nothing to copy');
      if (mountedRef.current) {
        setState('error');
      }
      onError?.(error);
      return false;
    }

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        fallbackCopy(text);
      }

      if (mountedRef.current) {
        setState('success');
      }
      onSuccess?.(text);

      // Auto-reset after duration
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setState('idle');
        }
        timeoutRef.current = null;
      }, successDuration);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');

      // Try fallback as last resort
      try {
        fallbackCopy(text);
        if (mountedRef.current) {
          setState('success');
        }
        onSuccess?.(text);

        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setState('idle');
          }
          timeoutRef.current = null;
        }, successDuration);

        return true;
      } catch {
        if (mountedRef.current) {
          setState('error');
        }
        onError?.(error);
        return false;
      }
    }
  }, [successDuration, onSuccess, onError]);

  return { copy, state, reset };
};

/**
 * Fallback copy using deprecated execCommand
 * Used for older browsers that don't support Clipboard API
 */
function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Prevent scrolling to bottom of page
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('execCommand copy failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
