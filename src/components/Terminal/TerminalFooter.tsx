/**
 * TerminalFooter Component
 *
 * Mobile virtual keyboard bar with common terminal commands.
 * Only visible on mobile devices (<768px).
 */

import { useState } from 'react';
import type { TerminalFooterProps } from '../../types/terminal';

export function TerminalFooter({ onCommand, isConnected }: TerminalFooterProps) {
  const [pasteStatus, setPasteStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Handle clipboard paste
  const handlePaste = async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setPasteStatus('error');
        setTimeout(() => setPasteStatus('idle'), 2000);
        return;
      }

      const text = await navigator.clipboard.readText();
      if (text) {
        onCommand(text);
        setPasteStatus('success');
        setTimeout(() => setPasteStatus('idle'), 1000);
      }
    } catch (error) {
      console.error('[TerminalFooter] Clipboard read failed:', error);
      setPasteStatus('error');
      setTimeout(() => setPasteStatus('idle'), 2000);
    }
  };

  // Virtual keyboard buttons
  const buttons = [
    {
      label: 'Tab',
      command: '\t',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      ),
    },
    {
      label: 'Ctrl+C',
      command: '\x03', // ASCII ETX (End of Text)
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
    },
    {
      label: 'Ctrl+D',
      command: '\x04', // ASCII EOT (End of Transmission)
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
    },
    {
      label: 'Esc',
      command: '\x1b', // ASCII ESC
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative md:hidden flex-shrink-0 border-t border-stone-200/50 dark:border-stone-700/50">
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-white/85 dark:bg-stone-900/90 backdrop-blur-md" />

      {/* Button grid */}
      <div className="relative grid grid-cols-5 gap-2 px-3 py-3">
        {/* Virtual keyboard buttons */}
        {buttons.map((button) => (
          <button
            key={button.label}
            onClick={() => onCommand(button.command)}
            disabled={!isConnected}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2.5
                       rounded-lg bg-stone-100 dark:bg-stone-800
                       text-stone-700 dark:text-stone-300
                       hover:bg-stone-200 dark:hover:bg-stone-700
                       active:scale-95 transition-all duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-3
                       focus-visible:ring-blue-600/50 focus-visible:ring-offset-2
                       focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900
                       min-h-[44px]" // Touch target size
            aria-label={button.label}
          >
            <span className="text-stone-600 dark:text-stone-400">{button.icon}</span>
            <span className="text-[10px] font-medium">{button.label}</span>
          </button>
        ))}

        {/* Paste button */}
        <button
          onClick={handlePaste}
          disabled={!isConnected}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2.5
                     rounded-lg transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-3
                     focus-visible:ring-blue-600/50 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900
                     min-h-[44px] ${pasteStatus === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : pasteStatus === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95'
            }`}
          aria-label="Paste from clipboard"
        >
          <span className="text-stone-600 dark:text-stone-400">
            {pasteStatus === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : pasteStatus === 'error' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            )}
          </span>
          <span className="text-[10px] font-medium">
            {pasteStatus === 'success' ? 'Pasted!' : pasteStatus === 'error' ? 'Failed' : 'Paste'}
          </span>
        </button>
      </div>
    </div>
  );
}
