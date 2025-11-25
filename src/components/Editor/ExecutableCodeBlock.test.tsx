import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExecutableCodeBlockComponent } from './ExecutableCodeBlock';
import type { NodeViewProps } from '@tiptap/react';
import { vi } from 'vitest';
import { useNotesStore } from '../../store/notesStore';

// Mocks
vi.mock('@tiptap/react', () => ({
    NodeViewWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { mockExecuteCode } = vi.hoisted(() => ({
    mockExecuteCode: vi.fn(),
}));

vi.mock('../../services/execution/executionModeManager', () => ({
    executionModeManager: {
        getExecutionProvider: () => ({
            executeCode: mockExecuteCode,
        }),
    },
}));

const mockStore = {
    executionMode: 'cloud',
    cloudExecutionEnabled: true,
    sandboxStatus: 'healthy',
    recreateSandbox: vi.fn().mockResolvedValue(undefined),
    setSandboxStatus: vi.fn(),
    autoHealSandbox: vi.fn().mockResolvedValue(true),
    activeNoteId: 'test-note',
    darkModeEnabled: false,
    executeCodeBlock: vi.fn(),
    updateCodeBlock: vi.fn(),
    deleteCodeBlock: vi.fn(),
    queueCodeExecution: vi.fn(),
    isOnline: true,
};

vi.mock('../../store/notesStore', () => ({
    useNotesStore: vi.fn((selector) => selector ? selector(mockStore) : mockStore),
}));

vi.mock('../../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
    },
}));

vi.mock('./CodeMirrorEditor', () => ({
    CodeMirrorEditor: () => <div data-testid="codemirror-editor">Editor</div>,
}));

describe('ExecutableCodeBlockComponent', () => {
    const mockUpdateAttributes = vi.fn();
    const mockNode = {
        attrs: {
            language: 'python',
            code: 'print("hello")',
            executionResult: undefined,
        },
        textContent: 'print("hello")',
    } as unknown as NodeViewProps['node'];

    beforeEach(() => {
        vi.clearAllMocks();
        mockExecuteCode.mockReset();
    });

    it('renders correctly', () => {
        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[] as unknown as NodeViewProps['decorations']}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[] as unknown as NodeViewProps['innerDecorations']}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText('python')).toBeInTheDocument();
        expect(screen.getByLabelText('Run code')).toBeInTheDocument();
        expect(screen.getByTestId('codemirror-editor')).toBeInTheDocument();
    });

    it('handles run button click', async () => {
        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[] as unknown as NodeViewProps['decorations']}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[] as unknown as NodeViewProps['innerDecorations']}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText('Run code');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockUpdateAttributes).toHaveBeenCalledWith(expect.objectContaining({ isExecuting: true }));
        });
    });

    it('shows execution result', () => {
        // Execution result stdout is shown for non-Python languages (Python uses Jupyter outputs)
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                language: 'javascript', // Non-Python language to test legacy output rendering
                executionResult: {
                    stdout: 'Hello World',
                    executionTime: 100,
                },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[] as unknown as NodeViewProps['decorations']}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[] as unknown as NodeViewProps['innerDecorations']}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText('Hello World')).toBeInTheDocument();
        expect(screen.getByText('Executed in 100ms')).toBeInTheDocument();
    });

    it('handles language change', () => {
        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[] as unknown as NodeViewProps['decorations']}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[] as unknown as NodeViewProps['innerDecorations']}
                HTMLAttributes={{}}
            />
        );

        const select = screen.getByLabelText('Select programming language');
        fireEvent.change(select, { target: { value: 'javascript' } });

        expect(mockUpdateAttributes).toHaveBeenCalledWith({ language: 'javascript' });
    });

    it('handles clear output', () => {
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                executionResult: { stdout: 'Output' },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[] as unknown as NodeViewProps['decorations']}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[] as unknown as NodeViewProps['innerDecorations']}
                HTMLAttributes={{}}
            />
        );

        const clearButton = screen.getByLabelText('Clear output');
        fireEvent.click(clearButton);

        expect(mockUpdateAttributes).toHaveBeenCalledWith({ executionResult: undefined });
    });

    it('handles execution error', async () => {
        mockExecuteCode.mockRejectedValueOnce(new Error('Execution failed'));

        // Use non-Python language to test executionModeManager path (Python uses executeCell)
        const jsNode = {
            ...mockNode,
            attrs: { ...mockNode.attrs, language: 'javascript' },
        };

        render(
            <ExecutableCodeBlockComponent
                node={jsNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText('Run code');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockUpdateAttributes).toHaveBeenCalledWith(expect.objectContaining({
                executionResult: expect.objectContaining({
                    error: 'Execution failed',
                    sandboxStatus: 'unhealthy',
                }),
            }));
        });
    });

    it('shows error when trying to run empty code', async () => {
        const emptyCodeNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                code: '',
            },
            textContent: '',
        };

        render(
            <ExecutableCodeBlockComponent
                node={emptyCodeNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText('Run code');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockUpdateAttributes).not.toHaveBeenCalledWith(expect.objectContaining({ isExecuting: true }));
        });
    });

    it('handles successful execution with exit code 0', async () => {
        mockExecuteCode.mockResolvedValueOnce({
            stdout: 'Success',
            stderr: '',
            exitCode: 0,
            executionTime: 100,
        });

        // Use non-Python language to test executionModeManager path (Python uses executeCell)
        const jsNode = {
            ...mockNode,
            attrs: { ...mockNode.attrs, language: 'javascript' },
        };

        render(
            <ExecutableCodeBlockComponent
                node={jsNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText('Run code');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockUpdateAttributes).toHaveBeenCalledWith(expect.objectContaining({
                executionResult: expect.objectContaining({
                    exitCode: 0,
                }),
            }));
        });
    });

    it('shows restart sandbox button when sandbox is unhealthy', () => {
        vi.mocked(useNotesStore).mockReturnValueOnce({
            ...mockStore,
            sandboxStatus: 'unhealthy',
        } as typeof mockStore);

        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const restartButton = screen.queryByLabelText('Restart sandbox');
        expect(restartButton).toBeInTheDocument();
    });

    it('handles restart sandbox click', async () => {
        const mockRecreateSandbox = vi.fn().mockResolvedValue(undefined);
        vi.mocked(useNotesStore).mockReturnValueOnce({
            ...mockStore,
            sandboxStatus: 'unhealthy',
            recreateSandbox: mockRecreateSandbox,
        } as typeof mockStore);

        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const restartButton = screen.getByLabelText('Restart sandbox');
        fireEvent.click(restartButton);

        await waitFor(() => {
            expect(mockRecreateSandbox).toHaveBeenCalled();
        });
    });

    it('shows stderr output', () => {
        // Stderr output is shown for non-Python languages (Python uses Jupyter outputs)
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                language: 'javascript', // Non-Python language to test legacy output rendering
                executionResult: {
                    stdout: '',
                    stderr: 'Error message',
                    exitCode: 1,
                },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('shows error output', () => {
        // Error output is shown for non-Python languages (Python uses Jupyter outputs)
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                language: 'javascript', // Non-Python language to test legacy output rendering
                executionResult: {
                    stdout: '',
                    stderr: '',
                    error: 'Execution error',
                    exitCode: 1,
                },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText('Execution error')).toBeInTheDocument();
    });

    it('handles code change from CodeMirror', () => {
        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        // CodeMirror onChange should trigger handleCodeChange
        const codeMirror = screen.getByTestId('codemirror-editor');
        expect(codeMirror).toBeInTheDocument();
    });

    it('shows rich outputs when present', () => {
        // Rich outputs are shown for non-Python languages (Python uses Jupyter outputs)
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                language: 'javascript', // Non-Python language to test legacy output rendering
                executionResult: {
                    stdout: '',
                    stderr: '',
                    exitCode: 0,
                    richOutputs: [
                        {
                            type: 'image/png',
                            data: 'base64data',
                        },
                    ],
                },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText(/rich output/i)).toBeInTheDocument();
    });

    it('handles execution with sandbox status update', async () => {
        mockExecuteCode.mockResolvedValueOnce({
            stdout: 'Success',
            stderr: '',
            exitCode: 0,
            sandboxStatus: 'healthy',
        });

        // Use non-Python language to test executionModeManager path (Python uses executeCell)
        const jsNode = {
            ...mockNode,
            attrs: { ...mockNode.attrs, language: 'javascript' },
        };

        render(
            <ExecutableCodeBlockComponent
                node={jsNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText('Run code');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(mockStore.setSandboxStatus).toHaveBeenCalledWith('healthy');
        });
    });

    it('shows run button when cloud execution is disabled', () => {
        vi.mocked(useNotesStore).mockReturnValueOnce({
            ...mockStore,
            executionMode: 'local',
            cloudExecutionEnabled: false,
        } as typeof mockStore);

        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        // Run button is always visible, can execute locally or in cloud
        const runButton = screen.queryByLabelText('Run code');
        expect(runButton).toBeInTheDocument();
    });

    it('disables run button when sandbox is creating', () => {
        vi.mocked(useNotesStore).mockReturnValueOnce({
            ...mockStore,
            sandboxStatus: 'creating',
        } as typeof mockStore);

        render(
            <ExecutableCodeBlockComponent
                node={mockNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        const runButton = screen.getByLabelText(/code is executing|run code/i);
        expect(runButton).toBeDisabled();
    });

    it('shows execution time when present', () => {
        const resultNode = {
            ...mockNode,
            attrs: {
                ...mockNode.attrs,
                executionResult: {
                    stdout: 'Output',
                    exitCode: 0,
                    executionTime: 150,
                },
            },
        };

        render(
            <ExecutableCodeBlockComponent
                node={resultNode}
                updateAttributes={mockUpdateAttributes}
                selected={false}
                extension={{} as NodeViewProps['extension']}
                getPos={() => 0}
                editor={{} as NodeViewProps['editor']}
                deleteNode={vi.fn()}
                decorations={[]}
                view={{} as unknown as NodeViewProps['view']}
                innerDecorations={[]}
                HTMLAttributes={{}}
            />
        );

        expect(screen.getByText('Executed in 150ms')).toBeInTheDocument();
    });
});
