/**
 * QuakeTerminal Component
 *
 * Quake-style dropdown terminal with glass morphism and modern aesthetics.
 * Keyboard shortcuts: Ctrl+` (toggle), Esc (close)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { terminalService } from '../../services/terminal';
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
    setGlobalTerminalStatus,
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
      if (e.ctrlKey && e.key === '`' && !e.metaKey) {
        e.preventDefault();
        if (isTerminalOpen) {
          handleClose();
        } else {
          toggleTerminal();
        }
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

  // Focus terminal when opened (after slide animation completes)
  useEffect(() => {
    if (isTerminalOpen && !isAnimating) {
      // Delay to ensure slide animation completes
      const timer = setTimeout(() => {
        // Find xterm instance via DOM query (xterm stores instance on DOM element)
        const terminalElement = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
        if (terminalElement) {
          terminalElement.focus();
        }
      }, 350); // 300ms animation + 50ms buffer

      return () => clearTimeout(timer);
    }
  }, [isTerminalOpen, isAnimating]);

  // Handle status change
  const handleStatusChange = useCallback(
    (status: TerminalSessionState['status']) => {
      setGlobalTerminalStatus(status);
    },
    [setGlobalTerminalStatus]
  );

  // Handle latency update (stored locally, not in global state)
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const handleLatencyUpdate = useCallback((lat: number) => {
    setLatency(lat);
  }, []);

  // Handle error
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const handleError = useCallback(
    (error: string) => {
      setErrorMessage(error);
      setGlobalTerminalStatus('error');
    },
    [setGlobalTerminalStatus]
  );

  // Handle command from virtual keyboard
  const handleCommand = useCallback(
    (command: string) => {
      if (globalTerminalSessionId && globalTerminalStatus === 'connected') {
        terminalService.executeCommand(globalTerminalSessionId, command).catch((error) => {
          handleError(error.message);
        });
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

  // Don't render if not open
  if (!isTerminalOpen) return null;

  return (
    <>
      {/* Backdrop overlay with glass blur */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          zIndex: 50, // Backdrop below terminal (z-index: 60)
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Terminal container */}
      <div
        className={`fixed left-0 right-0 shadow-elevation-4 transition-transform duration-300 ease-out ${
          isAnimating ? '-translate-y-full' : 'translate-y-0'
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
        <div className="relative flex flex-col h-full overflow-hidden rounded-b-xl border-b border-stone-200 dark:border-stone-800">
          {/* Header */}
          <TerminalHeader
            status={globalTerminalStatus}
            latency={latency}
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
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-500 dark:text-stone-400">
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
