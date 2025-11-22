import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TerminalEmulator } from './TerminalEmulator';
import { terminalService } from '../../services/terminal';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

// Mock dependencies
vi.mock('../../services/terminal');
vi.mock('@xterm/xterm', () => ({
    Terminal: vi.fn(function () {
        return {
            write: vi.fn(),
            open: vi.fn(),
            dispose: vi.fn(),
            focus: vi.fn(),
            refresh: vi.fn(),
            onData: vi.fn(),
            rows: 24,
            cols: 80,
            options: {},
            loadAddon: vi.fn(),
            element: document.createElement('div'),
            textarea: document.createElement('textarea'),
            buffer: {
                active: {
                    cursorX: 0,
                    cursorY: 0,
                },
            },
        };
    }),
}));
vi.mock('@xterm/addon-fit', () => ({
    FitAddon: vi.fn(function () {
        return {
            fit: vi.fn(),
        };
    }),
}));
vi.mock('@xterm/addon-web-links', () => ({
    WebLinksAddon: vi.fn(function () {
        return {};
    }),
}));

describe('TerminalEmulator', () => {
    const mockOnStatusChange = vi.fn();
    const mockOnLatencyUpdate = vi.fn();
    const mockOnError = vi.fn();
    let mockEventSource: {
        addEventListener: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        onopen: (() => void) | null;
        onerror: ((error: Event) => void) | null;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock ResizeObserver
        global.ResizeObserver = vi.fn(function () {
            return {
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
        });

        // Mock EventSource
        mockEventSource = {
            addEventListener: vi.fn(),
            close: vi.fn(),
            onopen: null,
            onerror: null,
        };

        (terminalService.connectStream as ReturnType<typeof vi.fn>) = vi.fn().mockReturnValue(mockEventSource);
        (terminalService.disconnectStream as ReturnType<typeof vi.fn>) = vi.fn();
        (terminalService.executeCommand as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({});
        (terminalService.resizeTerminal as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue(undefined);

        // Mock document.querySelector for dark mode detection
        document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should create xterm instance on mount', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            await waitFor(() => {
                expect(Terminal).toHaveBeenCalledWith(
                    expect.objectContaining({
                        fontFamily: "'JetBrains Mono Variable', 'SF Mono', 'Monaco', 'Inconsolata', 'Consolas', 'Courier New', monospace",
                        fontSize: 14,
                        cursorBlink: true,
                    })
                );
            });
        });

        it('should load FitAddon and WebLinksAddon', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            await waitFor(() => {
                expect(FitAddon).toHaveBeenCalled();
                expect(WebLinksAddon).toHaveBeenCalled();
            });
        });

        it('should apply correct theme based on dark mode', async () => {
            vi.clearAllMocks();
            document.documentElement.classList.add('dark');

            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            await waitFor(() => {
                expect(Terminal).toHaveBeenCalledWith(
                    expect.objectContaining({
                        theme: expect.objectContaining({
                            background: '#1c1917', // stone-900
                            foreground: '#f5f5f4', // stone-100
                        }),
                    })
                );
            });
        });
    });

    describe('SSE Connection', () => {
        it('should connect to SSE stream when session ID provided', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            await waitFor(() => {
                expect(terminalService.connectStream).toHaveBeenCalledWith('test-session');
            });
        });

        it('should call onStatusChange with connecting on mount', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            await waitFor(() => {
                expect(mockOnStatusChange).toHaveBeenCalledWith('connecting');
            });
        });

        it('should call onStatusChange with connected when connected event received', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const addEventListenerCalls = (mockEventSource.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
            const connectedListener = addEventListenerCalls.find(call => call[0] === 'connected');
            expect(connectedListener).toBeDefined();

            const mockEvent = new MessageEvent('connected', {
                data: JSON.stringify({ sandboxId: 'sandbox-123' }),
            });

            // Execute listener
            connectedListener![1](mockEvent);

            expect(mockOnStatusChange).toHaveBeenCalledWith('connecting');

            await waitFor(() => {
                expect(mockOnStatusChange).toHaveBeenCalledWith('connected');
            }, { timeout: 1000 });
        });

        it('should display Connected to sandbox message', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            // Get the instance created by the component
            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;

            const addEventListenerCalls = (mockEventSource.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
            const connectedListener = addEventListenerCalls.find(call => call[0] === 'connected');

            const mockEvent = new MessageEvent('connected', {
                data: JSON.stringify({ sandboxId: 'sandbox-123' }),
            });
            connectedListener![1](mockEvent);

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith(
                    expect.stringContaining('Connected to sandbox sandbox-123')
                );
            });
        });

        it('should handle reconnection on error', async () => {
            vi.useFakeTimers(); // Use fake timers ONLY for this test to control reconnection delay

            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const errorHandler = mockEventSource.onerror!;
            errorHandler(new Event('error'));

            expect(mockOnStatusChange).toHaveBeenCalledWith('error');
            expect(mockOnError).toHaveBeenCalledWith('Connection lost. Reconnecting...');

            vi.advanceTimersByTime(2000);

            expect(terminalService.connectStream).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });
    });

    describe('Input Handling', () => {
        it('should handle basic character input', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const onDataHandler = terminalInstance.onData.mock.calls[0][0];

            onDataHandler('a');

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith('a');
            });
        });

        it('should handle Enter key and submit command', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const onDataHandler = terminalInstance.onData.mock.calls[0][0];

            onDataHandler('e');
            onDataHandler('c');
            onDataHandler('h');
            onDataHandler('o');
            onDataHandler('\r');

            await waitFor(() => {
                expect(terminalService.executeCommand).toHaveBeenCalledWith('test-session', 'echo\n');
            });
        });

        it('should handle Backspace', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const onDataHandler = terminalInstance.onData.mock.calls[0][0];

            onDataHandler('a');
            onDataHandler('\x7F'); // DEL

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith('\b \b');
            });
        });

        it('should handle command history with up arrow', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const onDataHandler = terminalInstance.onData.mock.calls[0][0];

            onDataHandler('e');
            onDataHandler('c');
            onDataHandler('h');
            onDataHandler('o');
            onDataHandler('\r');

            vi.clearAllMocks();

            onDataHandler('\x1b[A'); // Up arrow

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith(expect.stringContaining('echo'));
            });
        });
    });

    describe('Output Handling', () => {
        it('should display stdout from output event', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const addEventListenerCalls = (mockEventSource.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
            const outputListener = addEventListenerCalls.find(call => call[0] === 'output');

            const mockEvent = new MessageEvent('output', {
                data: JSON.stringify({ stdout: 'hello world\n' }),
            });
            outputListener![1](mockEvent);

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith('hello world\r\n');
            });
        });

        it('should display stderr in red', async () => {
            render(
                <TerminalEmulator
                    sessionId="test-session"
                    noteId="test-note"
                    onStatusChange={mockOnStatusChange}
                    onLatencyUpdate={mockOnLatencyUpdate}
                    onError={mockOnError}
                />
            );

            const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
            const addEventListenerCalls = (mockEventSource.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
            const outputListener = addEventListenerCalls.find(call => call[0] === 'output');

            const mockEvent = new MessageEvent('output', {
                data: JSON.stringify({ stderr: 'error message\n' }),
            });
            outputListener![1](mockEvent);

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith(
                    expect.stringContaining('\x1b[31m')
                );
                expect(terminalInstance.write).toHaveBeenCalledWith(
                    expect.stringContaining('error message')
                );
            });
        });
    });
});
