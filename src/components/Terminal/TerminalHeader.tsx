/**
 * TerminalHeader Component
 *
 * Translucent header with glass morphism for the Quake terminal.
 * Displays connection status, latency, and close button.
 */

import { useState, useCallback } from 'react';
import type { TerminalHeaderProps } from '../../types/terminal';

export function TerminalHeader({
  status,
  latency,
  onClose,
  onResize,
}: TerminalHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);

  // Status indicator config
  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      pulse: true,
    },
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      pulse: false,
    },
    disconnected: {
      color: 'bg-gray-500',
      text: 'Disconnected',
      pulse: false,
    },
    error: {
      color: 'bg-red-500',
      text: 'Error',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  // Resize drag handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onResize) return;

      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        onResize(deltaY);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onResize]
  );

  return (
    <div className="relative flex-shrink-0 border-b border-stone-200/50 dark:border-stone-700/50">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-white/85 dark:bg-stone-900/90 backdrop-blur-md" />

      {/* Content */}
      <div className="relative flex items-center justify-between px-4 py-3">
        {/* Left: Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Status dot with pulse animation */}
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${config.color} ${
                  config.pulse ? 'animate-pulse' : ''
                }`}
              />
              {config.pulse && (
                <div
                  className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} opacity-75 animate-ping`}
                />
              )}
            </div>
            <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
              {config.text}
            </span>
          </div>

          {/* Latency display */}
          {status === 'connected' && latency !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>{latency}ms</span>
            </div>
          )}
        </div>

        {/* Right: Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 rounded-md
                     text-stone-500 hover:text-stone-700 dark:text-stone-400
                     dark:hover:text-stone-200 hover:bg-stone-100
                     dark:hover:bg-stone-800 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-3
                     focus-visible:ring-blue-600/50 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900"
          aria-label="Close terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Resize handle (bottom edge) */}
      {onResize && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize
                      hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors
                      ${isResizing ? 'bg-blue-500/30' : ''}`}
          aria-label="Resize terminal"
        />
      )}
    </div>
  );
}
