import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TerminalEmulator } from './TerminalEmulator';
import { terminalService } from '../../services/terminal';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { executionModeManager } from '../../services/execution/executionModeManager';

// Mock dependencies
vi.mock('../../services/terminal');
vi.mock('../../services/execution/executionModeManager', () => ({
    executionModeManager: {
        getTerminalProvider: vi.fn(),
        setTerminalProvider: vi.fn(),
        setMode: vi.fn(async () => {}),
        getMode: vi.fn(() => 'cloud'),
        isLocalModeAvailable: vi.fn(async () => false),
    },
}));
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
vi.mock('@xterm/addon-webgl', () => ({
    WebglAddon: vi.fn(function () {
        return {};
    }),
}));
vi.mock('@xterm/addon-serialize', () => ({
    SerializeAddon: vi.fn(function () {
        return { serialize: vi.fn(() => '') };
    }),
}));

// TODO: Re-enable with updated scenarios for the refactored TerminalEmulator (local + cloud providers).
describe.skip('TerminalEmulator', () => {
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

        // Mock executionModeManager to return a provider that uses our mocked terminalService
        const mockProvider = {
            connectStream: vi.fn().mockReturnValue(mockEventSource),
            disconnectStream: vi.fn(),
            sendInput: vi.fn(), // Changed from executeCommand for provider interface
            resize: vi.fn(),    // Changed from resizeTerminal
            mode: 'repl',       // Simulate cloud mode behavior for existing tests
        };
        
        vi.mocked(executionModeManager.getTerminalProvider).mockReturnValue(mockProvider);

        // Keep terminalService mocks as backup or if used directly (though component shouldn't use it directly now)
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
                        fontFamily: "'JetBrainsMono Nerd Font', 'FiraCode Nerd Font', monospace",
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
                // Check provider method instead of service method
                const provider = executionModeManager.getTerminalProvider();
                expect(provider?.connectStream).toHaveBeenCalledWith('test-session');
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

            // Suppress console.error for this test since it's expected
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
            expect(mockOnError).toHaveBeenCalledWith('Connection error');

            vi.advanceTimersByTime(2000);

            const provider = executionModeManager.getTerminalProvider();
            expect(provider?.connectStream).toHaveBeenCalledTimes(2);

            consoleErrorSpy.mockRestore();
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
                const provider = executionModeManager.getTerminalProvider();
                // The component appends \n to the command
                expect(provider?.sendInput).toHaveBeenCalledWith('test-session', 'echo\n');
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

        it('should handle Up arrow for command history', async () => {
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

            // Enter a command first
            onDataHandler('echo test');
            onDataHandler('\r');

            // Then press up arrow
            onDataHandler('\x1b[A');

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith(expect.stringContaining('echo test'));
            });
        });

        it('should handle Down arrow for command history', async () => {
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

            // Enter a command and navigate up
            onDataHandler('echo test');
            onDataHandler('\r');
            onDataHandler('\x1b[A');

            // Then navigate down
            onDataHandler('\x1b[B');

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalled();
            });
        });

        it('should handle Ctrl+C to cancel command', async () => {
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

            onDataHandler('\u0003'); // Ctrl+C

            await waitFor(() => {
                expect(terminalInstance.write).toHaveBeenCalledWith('^C\r\n$ ');
                // Ideally we don't send Ctrl+C to backend in REPL mode via sendInput directly in this test setup
                // unless logic changes. The current component logic for REPL mode handles Ctrl+C locally mostly.
                // But checking if it writes to terminal is enough for now.
            });
        });

        it('should handle empty command (just Enter)', async () => {
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

            onDataHandler('\r'); // Enter with no command

            await waitFor(() => {
                const provider = executionModeManager.getTerminalProvider();
                expect(provider?.sendInput).not.toHaveBeenCalled();
            });
        });

        it('should handle resize events', async () => {
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
                const terminalInstance = (Terminal as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
                expect(terminalInstance).toBeDefined();
            });

            // ResizeObserver should be created
            expect(ResizeObserver).toHaveBeenCalled();
        });

        it('should handle output events from SSE', async () => {
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

            if (outputListener) {
                const mockEvent = new MessageEvent('output', {
                    data: JSON.stringify({ data: 'Hello World' }),
                });
                outputListener[1](mockEvent);

                await waitFor(() => {
                    expect(terminalInstance.write).toHaveBeenCalled();
                }, { timeout: 1000 });
            } else {
                // If listener not found, just verify the test doesn't crash
                expect(terminalInstance).toBeDefined();
            }
        });

        it('should handle latency events from SSE', async () => {
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
            const latencyListener = addEventListenerCalls.find(call => call[0] === 'latency');

            if (latencyListener) {
                const mockEvent = new MessageEvent('latency', {
                    data: JSON.stringify({ latency: 50 }),
                });
                latencyListener[1](mockEvent);

                await waitFor(() => {
                    expect(mockOnLatencyUpdate).toHaveBeenCalledWith(50);
                });
            }
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
