/**
 * QuakeTerminal Component
 *
 * Quake-style dropdown terminal with glass morphism and modern aesthetics.
 * Keyboard shortcuts: Ctrl+` (toggle), Esc (close)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { executionModeManager } from '../../services/execution/executionModeManager';
import { TerminalHeader } from './TerminalHeader';
import { TerminalEmulator } from './TerminalEmulator';
import { TerminalFooter } from './TerminalFooter';
import type { TerminalSessionState } from '../../types/terminal';

export function QuakeTerminal() {
  const {
    isTerminalOpen,
    toggleTerminal,
    terminalHeight,
    setTerminalHeight,
    globalTerminalSessionId,
    globalTerminalStatus,
    // setGlobalTerminalStatus removed - using getState() to prevent re-render cascade
  } = useNotesStore();

  const [isAnimating, setIsAnimating] = useState(false);

  // Close terminal
  const handleClose = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      toggleTerminal();
      setIsAnimating(false);
    }, 300); // Match animation duration
  }, [toggleTerminal]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` - Toggle terminal (Ctrl avoids macOS system shortcut conflict)
      // Toggle with Ctrl + ` (Matches global shortcut)
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      // Esc - Close terminal (only if open and not focused on editor)
      if (e.key === 'Escape' && isTerminalOpen) {
        const activeElement = document.activeElement;
        const isEditorFocused =
          activeElement?.classList.contains('ProseMirror') ||
          activeElement?.closest('.editor-content');

        if (!isEditorFocused) {
          e.preventDefault();
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTerminalOpen, handleClose, toggleTerminal]);

  // Focus terminal when connected (wait for session to be ready)
  useEffect(() => {
    // Only focus when terminal is open AND connected
    if (!isTerminalOpen || globalTerminalStatus !== 'connected') {
      return;
    }

    const isMobile = window.innerWidth < 768;

    // Retry logic to ensure xterm textarea exists
    const focusTerminal = () => {
      const terminalElement = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;

      if (terminalElement) {
        // Successfully found the textarea, focus it
        terminalElement.focus({ preventScroll: true });

        // On mobile, also trigger click to ensure keyboard appears
        if (isMobile) {
          terminalElement.click();
        }
        return true; // Success
      }
      return false; // Not found yet
    };

    // Initial delay: shorter on mobile since we're already waiting for connection
    const initialDelay = isMobile ? 50 : 100;

    const timer = setTimeout(() => {
      // Try to focus immediately
      if (focusTerminal()) {
        return; // Success on first try
      }

      // Retry with exponential backoff if not found
      let retryCount = 0;
      const maxRetries = 5;

      const retryInterval = setInterval(() => {
        if (focusTerminal() || retryCount >= maxRetries) {
          clearInterval(retryInterval);
        }
        retryCount++;
      }, 100); // Retry every 100ms

      // Cleanup retry interval
      return () => clearInterval(retryInterval);
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [isTerminalOpen, globalTerminalStatus]);

  // Handle status change
  const handleStatusChange = useCallback(
    (status: TerminalSessionState['status']) => {
      useNotesStore.getState().setGlobalTerminalStatus(status);
    },
    []
  );

  // Handle latency update (stored locally, not in global state)
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const handleLatencyUpdate = useCallback((lat: number) => {
    setLatency(lat);
  }, []);

  // Session metadata (shell + cwd for display)
  const [sessionInfo, setSessionInfo] = useState<{ shell?: string; workingDir?: string; provider?: 'cloud' }>({});

  // Handle error
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const handleError = useCallback(
    (error: string) => {
      setErrorMessage(error);
      useNotesStore.getState().setGlobalTerminalStatus('error');
    },
    []
  );

  // Handle command from virtual keyboard
  const handleCommand = useCallback(
    (command: string) => {
      if (globalTerminalSessionId && globalTerminalStatus === 'connected') {
        const provider = executionModeManager.getTerminalProvider();
        if (provider) {
          provider.sendInput(globalTerminalSessionId, command).catch((error) => {
            handleError(error.message);
          });
        }
      }
    },
    [globalTerminalSessionId, globalTerminalStatus, handleError]
  );

  // Handle resize
  const handleResize = useCallback(
    (deltaY: number) => {
      const newHeight = Math.max(200, Math.min(800, terminalHeight - deltaY));
      setTerminalHeight(newHeight);
    },
    [terminalHeight, setTerminalHeight]
  );

  // Don't render backdrop if not open
  // if (!isTerminalOpen) return null; <-- Removed to keep terminal mounted

  return (
    <>
      {/* Backdrop overlay with glass blur */}
      {isTerminalOpen && (
        <div
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'
            }`}
          style={{
            zIndex: 50, // Backdrop below terminal (z-index: 60)
          }}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Terminal container - Always mounted to preserve state/connection */}
      <div
        className={`fixed left-0 right-0 shadow-elevation-4 transition-transform duration-300 ease-out ${!isTerminalOpen || isAnimating ? '-translate-y-full' : 'translate-y-0'
          }`}
        style={{
          top: 0,
          height: `${terminalHeight}px`,
          zIndex: 60, // Terminal always on top (higher than z-50 modals)
        }}
      >
        {/* Solid background for terminal visibility */}
        <div className="absolute inset-0 bg-white dark:bg-stone-900" />

        {/* Terminal content */}
        <div className="relative flex flex-col h-full overflow-hidden rounded-b-xl border-b border-stone-200 dark:border-stone-800" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
          {/* Header */}
          <TerminalHeader
            status={globalTerminalStatus}
            latency={latency}
            shell={sessionInfo.shell}
            workingDir={sessionInfo.workingDir}
            onClose={handleClose}
            onResize={handleResize}
          />

          {/* Terminal emulator */}
          {globalTerminalSessionId ? (
            <TerminalEmulator
              sessionId={globalTerminalSessionId}
              noteId="global" // Global session (not tied to note)
              onStatusChange={handleStatusChange}
              onLatencyUpdate={handleLatencyUpdate}
              onError={handleError}
              onSessionInfo={setSessionInfo}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-500 dark:text-stone-400" style={{ width: '100%', maxWidth: '100%' }}>
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-stone-400 dark:text-stone-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm">Connecting to terminal...</p>
                {errorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Mobile virtual keyboard */}
          <TerminalFooter
            onCommand={handleCommand}
            isConnected={globalTerminalStatus === 'connected'}
          />
        </div>
      </div>
    </>
  );
}
