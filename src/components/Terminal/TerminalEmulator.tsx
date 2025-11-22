/**
 * TerminalEmulator Component
 *
 * xterm.js integration with SSE streaming, command history, and ANSI color support.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { terminalService } from '../../services/terminal';
import type { TerminalEmulatorProps, TerminalTheme } from '../../types/terminal';

// Simple console logger (replace with proper logger if needed)
const logger = {
  debug: (..._args: unknown[]) => {
    // Quiet debug logs to keep console clean
  },
  error: (...args: unknown[]) => console.error('[TerminalEmulator]', ...args),
};

export function TerminalEmulator({
  sessionId,
  noteId: _noteId, // Unused but required by interface
  onStatusChange,
  onLatencyUpdate,
  onError,
}: TerminalEmulatorProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentLineRef = useRef<string>('');
  const initializedRef = useRef(false);
  const promptShownRef = useRef(false);
  const ensurePrompt = useCallback(() => {
    const terminal = xtermRef.current;
    if (!terminal) return;
    terminal.write('$ ');
    promptShownRef.current = true;
  }, []);

  // Reset prompt when session changes
  useEffect(() => {
    promptShownRef.current = false;
  }, [sessionId]);

  // Light mode theme (clean, minimal aesthetic) - IMPORTANT: background must be opaque for mobile visibility
  const lightTheme: TerminalTheme = {
    background: '#f5f5f4', // stone-100 - light but not pure white for better contrast
    foreground: '#0c0a09', // stone-950 - very dark for maximum contrast
    cursor: '#3b82f6', // blue-500
    cursorAccent: '#f5f5f4',
    selectionBackground: '#3b82f680', // blue-500 50% opacity
    black: '#44403c', // stone-700
    red: '#dc2626', // red-600
    green: '#16a34a', // green-600
    yellow: '#ca8a04', // yellow-600
    blue: '#2563eb', // blue-600
    magenta: '#9333ea', // purple-600
    cyan: '#0891b2', // cyan-600
    white: '#d6d3d1', // stone-300
    brightBlack: '#78716c', // stone-500
    brightRed: '#f87171', // red-400
    brightGreen: '#4ade80', // green-400
    brightYellow: '#facc15', // yellow-400
    brightBlue: '#60a5fa', // blue-400
    brightMagenta: '#c084fc', // purple-400
    brightCyan: '#22d3ee', // cyan-400
    brightWhite: '#f5f5f4', // stone-100
  };

  // Dark mode theme
  const darkTheme: TerminalTheme = {
    background: '#1c1917', // stone-900
    foreground: '#f5f5f4', // stone-100
    cursor: '#3b82f6', // blue-500
    cursorAccent: '#1c1917',
    selectionBackground: '#3b82f680', // blue-500 50% opacity
    black: '#292524', // stone-800
    red: '#dc2626', // red-600
    green: '#16a34a', // green-600
    yellow: '#ca8a04', // yellow-600
    blue: '#2563eb', // blue-600
    magenta: '#9333ea', // purple-600
    cyan: '#0891b2', // cyan-600
    white: '#d6d3d1', // stone-300
    brightBlack: '#78716c', // stone-500
    brightRed: '#f87171', // red-400
    brightGreen: '#4ade80', // green-400
    brightYellow: '#facc15', // yellow-400
    brightBlue: '#60a5fa', // blue-400
    brightMagenta: '#c084fc', // purple-400
    brightCyan: '#22d3ee', // cyan-400
    brightWhite: '#fafaf9', // stone-50
  };

  // Detect dark mode from document class (follows app's dark mode setting)
  const isDarkMode =
    typeof window !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleTerminalInput = useCallback((data: string) => {
    const terminal = xtermRef.current;
    if (!terminal) return;

    // Handle special keys
    if (data === '\r') {
      terminal.write('\r\n');
      const command = currentLineRef.current;
      if (command.trim()) {
        commandHistoryRef.current.push(command);
        historyIndexRef.current = commandHistoryRef.current.length;
        terminalService
          .executeCommand(sessionId, command + '\n')
          .catch((error) => onError(error.message));
      }
      currentLineRef.current = '';
    } else if (data === '\x7F' || data === '\b') {
      // Backspace
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.slice(0, -1);
        terminal.write('\b \b');
      }
    } else if (data === '\x1b[A') {
      // Up arrow - previous command
      if (commandHistoryRef.current.length > 0 && historyIndexRef.current > 0) {
        historyIndexRef.current--;
        const prevCommand = commandHistoryRef.current[historyIndexRef.current];
        // Clear current line
        terminal.write(`\x1b[2K\r$ ${prevCommand}`);
        currentLineRef.current = prevCommand;
      }
    } else if (data === '\x1b[B') {
      // Down arrow - next command
      if (
        commandHistoryRef.current.length > 0 &&
        historyIndexRef.current < commandHistoryRef.current.length - 1
      ) {
        historyIndexRef.current++;
        const nextCommand = commandHistoryRef.current[historyIndexRef.current];
        terminal.write(`\x1b[2K\r$ ${nextCommand}`);
        currentLineRef.current = nextCommand;
      } else {
        // Clear line if no next command
        historyIndexRef.current = commandHistoryRef.current.length;
        terminal.write('\x1b[2K\r$ ');
        currentLineRef.current = '';
      }
    } else if (data === '\u0003') {
      // Ctrl+C - cancel current command
      terminal.write('^C\r\n$ ');
      terminalService.executeCommand(sessionId, '\x04').catch((error) => onError(error.message));
      currentLineRef.current = '';
    } else {
      // Normal character - echo and add to current line
      terminal.write(data);
      currentLineRef.current += data;
    }
  }, [onError, sessionId]);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      fontFamily: "'JetBrains Mono Variable', 'SF Mono', 'Monaco', 'Inconsolata', 'Consolas', 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      theme,
      allowProposedApi: true,
      scrollback: 10000,
      rows: 24,
      cols: 80,
      // Mobile optimizations
      convertEol: true,
      screenReaderMode: false,
      windowsMode: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);

    // Store refs
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    ensurePrompt();

    // Ensure terminal viewport has opaque background (fixes mobile rendering)
    if (terminalRef.current) {
      const viewport = terminalRef.current.querySelector('.xterm-viewport') as HTMLElement;
      const screen = terminalRef.current.querySelector('.xterm-screen') as HTMLElement;
      const canvas = terminalRef.current.querySelector('canvas') as HTMLCanvasElement;

      if (viewport) {
        viewport.style.backgroundColor = theme.background;
      }
      if (screen) {
        screen.style.backgroundColor = theme.background;
      }
      if (canvas) {
        // Force canvas to redraw
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = theme.background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    // Delay fit() until DOM is fully rendered (fixes dimensions error)
    const initTimeout = setTimeout(() => {
      fitAddon.fit();
      terminal.refresh(0, terminal.rows - 1); // Force refresh all rows
    }, 100);

    // Handle terminal input
    terminal.onData((data) => {
      handleTerminalInput(data);
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        // Send resize to backend (optional - won't fail if endpoint missing)
        if (terminal.rows && terminal.cols) {
          terminalService.resizeTerminal(sessionId, terminal.cols, terminal.rows).catch(() => {
            // Ignore resize errors - non-critical
          });
        }
      } catch (_err) {
        // Ignore fit errors during initialization
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    initializedRef.current = true;

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      resizeObserver.disconnect();
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [sessionId, theme, onError, handleTerminalInput, ensurePrompt]);

  // Connect to SSE stream (with reconnection on error)
  useEffect(() => {
    if (!initializedRef.current || !sessionId) return;

    onStatusChange('connecting');

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      // Clean up previous connection
      if (eventSource) {
        terminalService.disconnectStream(eventSource);
      }

      eventSource = terminalService.connectStream(sessionId);
      eventSourceRef.current = eventSource;

      const pingStartTime = Date.now();

      // Handle 'connected' event - sent when SSE connection established
      eventSource.addEventListener('connected', (event: Event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);

        if (xtermRef.current) {
          xtermRef.current.write(`\x1b[32mConnected to sandbox ${data.sandboxId}\x1b[0m\r\n`);
          ensurePrompt();
          xtermRef.current.refresh(0, xtermRef.current.rows - 1);

          // Small delay to ensure terminal is fully rendered before signaling connected
          // This helps prevent race conditions on mobile/slower devices
          setTimeout(() => {
            onStatusChange('connected');
          }, 50);
        } else {
          console.error('[TerminalEmulator] xtermRef is null when trying to write connected message!');
          // Still signal connected even if write fails
          onStatusChange('connected');
        }

        logger.debug('SSE connected', data);
      });

      // Handle 'output' event - command stdout/stderr
      eventSource.addEventListener('output', (event: Event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);

        if (xtermRef.current) {
          // Write stdout (convert \n to \r\n for proper line breaks)
          if (data.stdout) {
            const output = data.stdout.replace(/\n/g, '\r\n');
            xtermRef.current.write(output);
          }

          // Write stderr in red (convert \n to \r\n for proper line breaks)
          if (data.stderr) {
            const output = data.stderr.replace(/\n/g, '\r\n');
            xtermRef.current.write(`\x1b[31m${output}\x1b[0m`);
          }
        }
      });

      // Handle 'complete' event - command finished
      eventSource.addEventListener('complete', (event: Event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);

        if (xtermRef.current) {
          // Show prompt after command completes
          if (!promptShownRef.current) {
            promptShownRef.current = true;
          }
          xtermRef.current.write('\r\n$ ');
        }

        logger.debug('Command complete', data);
      });

      // Handle 'error' event - command execution error
      eventSource.addEventListener('error', (event: Event) => {
        // Guard against transport errors which don't have data property
        if (!(event instanceof MessageEvent) || !event.data) {
          logger.debug('SSE transport error (no data), ignoring custom error handler');
          return;
        }

        const data = JSON.parse(event.data);

        const errorMsg = data.error || 'Unknown error';
        onError(errorMsg);

        if (xtermRef.current) {
          // Error message already has \r\n at end - no conversion needed here
          xtermRef.current.write(`\x1b[31m[Error: ${errorMsg}]\x1b[0m\r\n`);
          xtermRef.current.write('$ '); // Show prompt after error
        }
      });

      // Handle 'heartbeat' event - keepalive
      eventSource.addEventListener('heartbeat', (event: Event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);

        // Calculate latency from heartbeat timestamp
        const latency = Date.now() - (data.timestamp || pingStartTime);
        onLatencyUpdate(latency);
      });

      // Handle generic onopen (connection established)
      eventSource.onopen = () => {
        // Note: 'connected' event will provide actual session info
        ensurePrompt();
      };

      // Handle generic onerror (connection lost - reconnect)
      eventSource.onerror = (error) => {
        logger.error('EventSource error', error);
        onStatusChange('error');
        onError('Connection lost. Reconnecting...');

        // Auto-reconnect after 2 seconds
        reconnectTimeout = setTimeout(() => {
          logger.debug('Reconnecting SSE...');
          connect();
        }, 2000);
      };
    };

    // Start initial connection
    connect();

    // Cleanup
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        terminalService.disconnectStream(eventSource);
      }
      eventSourceRef.current = null;
    };
  }, [sessionId, onStatusChange, onLatencyUpdate, onError, ensurePrompt]);

  // Focus terminal on touch/click (mobile support)
  const handleContainerInteraction = useCallback(() => {
    if (xtermRef.current) {
      // Focus the xterm textarea
      const textarea = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus({ preventScroll: true });
      } else {
        // Fallback: try to focus the terminal directly
        xtermRef.current.focus();
      }
    }
  }, []);

  return (
    <div
      ref={terminalRef}
      className="flex-1 bg-white dark:bg-stone-900 cursor-text"
      style={{
        minHeight: '200px',
        height: '100%',
        width: '100%',
        overflow: 'visible',
        position: 'relative',
        touchAction: 'manipulation' // Optimize touch events on mobile
      }}
      onClick={handleContainerInteraction}
      onTouchStart={handleContainerInteraction}
      role="textbox"
      aria-label="Terminal input"
      tabIndex={-1}
    />
  );
}
