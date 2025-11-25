/**
 * TerminalEmulator Component
 *
 * High-performance xterm.js integration with WebGL support.
 * Streaming terminal that forwards all keystrokes to the Hopx sandbox backend.
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { ImageAddon } from '@xterm/addon-image';
import '@xterm/xterm/css/xterm.css';
import { executionModeManager } from '../../services/execution/executionModeManager';
import { useNotesStore } from '../../store/notesStore';
import type { TerminalEmulatorProps, TerminalTheme } from '../../types/terminal';

// Simple console logger
const logger = {
  debug: (...args: unknown[]) => console.log('[TerminalEmulator]', ...args),
  error: (...args: unknown[]) => console.error('[TerminalEmulator]', ...args),
};

// Theme constants - defined once outside component to prevent recreation
const LIGHT_THEME: TerminalTheme = {
  background: '#f5f5f4', // stone-100
  foreground: '#0c0a09', // stone-950
  cursor: '#3b82f6',
  cursorAccent: '#f5f5f4',
  selectionBackground: '#3b82f680',
  black: '#44403c',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#d6d3d1',
  brightBlack: '#78716c',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#f5f5f4',
};

const DARK_THEME: TerminalTheme = {
  background: '#1c1917', // stone-900
  foreground: '#f5f5f4', // stone-100
  cursor: '#3b82f6',
  cursorAccent: '#1c1917',
  selectionBackground: '#3b82f680',
  black: '#292524',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#d6d3d1',
  brightBlack: '#78716c',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#fafaf9',
};

const CLEAR_LINE_SEQUENCE = '\u0015\u000B';
const BACKSPACE_ECHO = '\b \b';
const isPrintableSequence = (input: string): boolean => Array.from(input).every((char) => char >= ' ' && char <= '~');

export function TerminalEmulator({
  sessionId,
  noteId: _noteId,
  onStatusChange,
  onLatencyUpdate,
  onError,
  onSessionInfo,
}: TerminalEmulatorProps) {
  const isTerminalOpen = useNotesStore((state) => state.isTerminalOpen);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Instance refs
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const serializeAddonRef = useRef<SerializeAddon | null>(null);
  const isOpenedRef = useRef(false);

  // Connection refs
  const streamRef = useRef<EventSource | null>(null);

  // REPL State (Cloud mode only)
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentLineRef = useRef<string>('');
  const pendingEchoRef = useRef('');
  const isEditingRef = useRef(false);
  const draftCommandRef = useRef('');

  // Stable theme selection using useMemo to prevent recreation
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const theme = useMemo(() => isDarkMode ? DARK_THEME : LIGHT_THEME, [isDarkMode]);

  // Stable callback refs to prevent connection re-establishment
  const onStatusChangeRef = useRef(onStatusChange);
  const onLatencyUpdateRef = useRef(onLatencyUpdate);
  const onErrorRef = useRef(onError);
  const onSessionInfoRef = useRef(onSessionInfo);

  // Update refs when callbacks change (doesn't trigger effects)
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onLatencyUpdateRef.current = onLatencyUpdate;
    onErrorRef.current = onError;
    onSessionInfoRef.current = onSessionInfo;
  }, [onStatusChange, onLatencyUpdate, onError, onSessionInfo]);


  const handleTerminalInput = useCallback((data: string) => {
    const provider = executionModeManager.getTerminalProvider();
    if (!provider) return;

    const sendChunk = (chunk: string) => {
      if (!chunk) return;
      provider.sendInput(sessionId, chunk).catch(err => onErrorRef.current(err.message));
    };

    const queueEcho = (chunk: string) => {
      if (!chunk) return;
      pendingEchoRef.current += chunk;
    };

    const replaceLineWithCommand = (command: string) => {
      currentLineRef.current = command;
      isEditingRef.current = command.length > 0;
      if (command) {
        queueEcho(command);
      }
      sendChunk(`${CLEAR_LINE_SEQUENCE}${command}`);
    };

    const handleHistoryNavigation = (direction: 'up' | 'down') => {
      const history = commandHistoryRef.current;
      if (history.length === 0) {
        sendChunk(data);
        return;
      }

      if (historyIndexRef.current === -1) {
        historyIndexRef.current = history.length;
      }

      if (direction === 'up') {
        if (historyIndexRef.current === history.length) {
          draftCommandRef.current = currentLineRef.current;
        }
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
        }
      } else {
        if (historyIndexRef.current < history.length) {
          historyIndexRef.current += 1;
        }
      }

      if (historyIndexRef.current >= history.length) {
        historyIndexRef.current = history.length;
        replaceLineWithCommand(draftCommandRef.current || '');
        draftCommandRef.current = '';
        return;
      }

      const command = history[historyIndexRef.current];
      replaceLineWithCommand(command);
    };

    if (data === '\r') {
      const command = currentLineRef.current;
      if (command.trim()) {
        commandHistoryRef.current.push(command);
      }
      historyIndexRef.current = commandHistoryRef.current.length;
      draftCommandRef.current = '';
      currentLineRef.current = '';
      isEditingRef.current = false;
      sendChunk('\r');
      return;
    }

    if (data === '\x7F' || data === '\b') {
      const characters = Array.from(currentLineRef.current);
      if (characters.length > 0) {
        characters.pop();
        currentLineRef.current = characters.join('');
      }
      isEditingRef.current = currentLineRef.current.length > 0;
      queueEcho(BACKSPACE_ECHO);
      sendChunk('\x7F');
      return;
    }

    if (data === '\x1b[A') {
      handleHistoryNavigation('up');
      return;
    }

    if (data === '\x1b[B') {
      handleHistoryNavigation('down');
      return;
    }

    if (data === '\u0003') {
      currentLineRef.current = '';
      draftCommandRef.current = '';
      isEditingRef.current = false;
      pendingEchoRef.current = '';
      sendChunk(data);
      return;
    }

    if (isPrintableSequence(data)) {
      currentLineRef.current += data;
      isEditingRef.current = true;
      queueEcho(data);
    } else if (data === '\t') {
      isEditingRef.current = true;
    }

    sendChunk(data);
  }, [sessionId]);

  const processBackendOutput = useCallback((payload: string) => {
    if (!payload) return;
    let pending = pendingEchoRef.current;
    let command = currentLineRef.current;

    for (const char of payload) {
      if (pending.length > 0 && char === pending[0]) {
        pending = pending.slice(1);
        continue;
      }

      if (isEditingRef.current) {
        if (char === '\b' || char === '\x7F') {
          command = Array.from(command).slice(0, -1).join('');
          continue;
        }

        if (char === '\r' || char === '\n' || char === '\u0007') {
          continue;
        }

        if (char >= ' ') {
          command += char;
        }
      }
    }

    pendingEchoRef.current = pending;
    currentLineRef.current = command;
  }, []);

  useEffect(() => {
    commandHistoryRef.current = [];
    historyIndexRef.current = -1;
    currentLineRef.current = '';
    draftCommandRef.current = '';
    pendingEchoRef.current = '';
    isEditingRef.current = false;
  }, [sessionId]);

  // 1. Initialize xterm.js instance (runs ONCE)
  useEffect(() => {
    if (xtermRef.current) return;

    const terminal = new Terminal({
      fontFamily: "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', monospace",
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      theme,
      allowProposedApi: true,
      scrollback: 10000,
      rows: 24,
      cols: 80,
      convertEol: true,
      scrollOnUserInput: true,
      drawBoldTextInBrightColors: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
    });

    // Enable bracketed paste (proposed API not typed yet)
    (terminal as Terminal & { options: { bracketedPasteMode?: boolean } }).options.bracketedPasteMode = true;

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const serializeAddon = new SerializeAddon();

    // Load basic addons BEFORE terminal.open()
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(serializeAddon);

    // Register OSC sequence handlers for shell integration
    // OSC 7: Working directory reporting (used by many shells)
    terminal.parser.registerOscHandler(7, (data: string) => {
      try {
        // Format: OSC 7 ; file://hostname/path ST
        const match = data.match(/^file:\/\/[^/]*(.*)$/);
        if (match) {
          const cwd = decodeURIComponent(match[1]);
          logger.debug('Working directory changed:', cwd);
          // Store CWD for potential UI display or features
          // Can be expanded to update state/store later
        }
      } catch (err) {
        logger.debug('Failed to parse OSC 7', err);
      }
      return true; // Handler processed the sequence
    });

    // OSC 133: VS Code shell integration protocol
    // Format: OSC 133 ; <marker> ST
    // Markers: A (prompt start), B (prompt end), C (command start), D (command end)
    terminal.parser.registerOscHandler(133, (data: string) => {
      const marker = data.trim();
      switch (marker) {
        case 'A':
          logger.debug('Shell integration: Prompt start');
          // Can track semantic zones for future features
          break;
        case 'B':
          logger.debug('Shell integration: Prompt end');
          break;
        case 'C':
          logger.debug('Shell integration: Command start');
          break;
        case 'D':
          logger.debug('Shell integration: Command end');
          break;
        default:
          logger.debug('Shell integration: Unknown marker', marker);
      }
      return true;
    });

    // OSC 1337: iTerm2 inline images protocol
    // Already handled by ImageAddon, but can add custom handling if needed

    // Input handler
    terminal.onData(handleTerminalInput);

    // Store refs
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;
    serializeAddonRef.current = serializeAddon;

    return () => {
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      isOpenedRef.current = false;
    };
  }, [theme, handleTerminalInput]);

  // 2. Handle Mounting/Rendering to DOM (runs when visible)
  useEffect(() => {
    if (!isTerminalOpen || !terminalRef.current || !xtermRef.current) return;

    // Open terminal into DOM if not already
    if (!isOpenedRef.current) {
      xtermRef.current.open(terminalRef.current);
      isOpenedRef.current = true;

      // Load renderer addons AFTER terminal.open() - critical for proper initialization
      const unicode11Addon = new Unicode11Addon();
      const imageAddon = new ImageAddon();

      try {
        xtermRef.current.loadAddon(unicode11Addon);
        xtermRef.current.unicode.activeVersion = '11';
      } catch (err) {
        logger.error('Unicode11 addon failed:', err);
      }

      try {
        xtermRef.current.loadAddon(imageAddon);
      } catch (err) {
        logger.error('Image addon failed:', err);
      }

      // TEMPORARILY DISABLED: Canvas renderer appears to have rendering issues
      // Using DOM renderer for now until Canvas rendering is debugged
      // try {
      //   const canvasAddon = new CanvasAddon();
      //   xtermRef.current.loadAddon(canvasAddon);
      //   logger.debug('Canvas addon loaded successfully');
      // } catch (err) {
      //   logger.error('Canvas renderer failed, using DOM fallback:', err);
      // }
      logger.debug('Using DOM renderer (Canvas temporarily disabled for debugging)');

      // Style viewport
      const viewport = terminalRef.current.querySelector('.xterm-viewport') as HTMLElement;
      if (viewport) viewport.style.backgroundColor = theme.background;

      // IMMEDIATELY fit the terminal (don't wait for setTimeout)
      // This ensures the terminal is ready before data starts flowing
      try {
        fitAddonRef.current?.fit();

        // Force initial render - CRITICAL for Canvas renderer
        const terminal = xtermRef.current;
        if (terminal && terminal.cols > 0 && terminal.rows > 0) {
          // Clear screen and force full refresh
          terminal.clear();
          terminal.refresh(0, terminal.rows - 1);
          terminal.scrollToBottom();

          // Write a test character and immediately clear it to ensure Canvas is working
          terminal.write(' ');
          terminal.write('\b');
        }
      } catch (err) {
        logger.error('Failed to fit terminal:', err);
      }
    }

    // Additional delayed fit for any resize after mount
    const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          // Sync size with backend once fitted
          const terminal = xtermRef.current;
          if (terminal && terminal.cols > 0 && terminal.rows > 0) {
             const provider = executionModeManager.getTerminalProvider();
             provider?.resize(sessionId, terminal.cols, terminal.rows);
             // Force refresh and focus
             terminal.refresh(0, terminal.rows - 1);
             terminal.scrollToBottom();
             terminal.focus();
          }
        } catch (_err) { /* ignore */ }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isTerminalOpen, theme.background, sessionId]);

  // 3. Handle Resizing (ResizeObserver) with debounce to avoid bursts
  useEffect(() => {
    if (!terminalRef.current || !xtermRef.current) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      // Only resize if visible and opened
      if (!isTerminalOpen || !isOpenedRef.current) return;

      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          const terminal = xtermRef.current;
          if (terminal && terminal.cols > 0 && terminal.rows > 0) {
            const provider = executionModeManager.getTerminalProvider();
            provider?.resize(sessionId, terminal.cols, terminal.rows);
          }
        } catch (_err) { /* ignore */ }
      }, 100);
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [isTerminalOpen, sessionId]);


  // Connection Management
  useEffect(() => {
    if (!sessionId) return;
    onStatusChangeRef.current('connecting');

    const provider = executionModeManager.getTerminalProvider();
    if (!provider) {
      onErrorRef.current('Terminal provider not available');
      return;
    }

    let stream: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stream) {
        provider.disconnectStream(stream);
      }

      stream = provider.connectStream(sessionId);
      streamRef.current = stream;

      if (!stream) {
        onErrorRef.current('Failed to connect to terminal stream');
        onStatusChangeRef.current('error');
        return;
      }

      stream.onopen = () => {
        onStatusChangeRef.current('connected');
      };

      stream.onerror = () => {
        onStatusChangeRef.current('error');
        onErrorRef.current('Connection error');
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
      };

      stream.addEventListener('connected', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        if (xtermRef.current && isOpenedRef.current) {
          xtermRef.current.write(`\x1b[32mConnected to sandbox ${data.sandboxId}\x1b[0m\r\n`);
        }
        onSessionInfoRef.current?.({ provider: 'cloud' });
        onStatusChangeRef.current('connected');
      });

      stream.addEventListener('terminal_message', (e: MessageEvent) => {
        const message = JSON.parse(e.data);
        const terminal = xtermRef.current;
        if (terminal && isOpenedRef.current && message.type === 'output' && message.data) {
          processBackendOutput(message.data);
          terminal.write(message.data);
        }
      });

      stream.addEventListener('output', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        const terminal = xtermRef.current;
        if (terminal && isOpenedRef.current) {
          if (data.stdout) {
            terminal.write(data.stdout.replace(/\n/g, '\r\n'));
          }
          if (data.stderr) {
            terminal.write(`\x1b[31m${data.stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
          }
        }
      });

      stream.addEventListener('latency', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (typeof payload.latency === 'number') {
            onLatencyUpdateRef.current(payload.latency);
          }
        } catch (_err) {
          // ignore malformed latency payloads
        }
      });
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (stream) {
        provider.disconnectStream(stream);
      }
    };
  }, [sessionId, processBackendOutput]);
  // NOTE: All callbacks (onStatusChange, onLatencyUpdate, onError, onSessionInfo) are accessed via stable refs.
  // This prevents reconnection when parent component re-renders with new callback instances.

  // Focus handler
  const handleFocus = useCallback(() => {
    xtermRef.current?.focus();
  }, []);

  return (
    <div
      ref={terminalRef}
      className="flex-1 bg-white dark:bg-stone-900 cursor-text"
      style={{ height: '100%', width: '100%', position: 'relative', touchAction: 'none', overflow: 'hidden' }}
      onClick={handleFocus}
      onTouchStart={handleFocus}
    />
  );
}
