import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../../store/notesStore', () => {
    const mockStore = {
        notes: [{ id: 'test-note', title: 'Test Note' }],
        addNote: vi.fn(),
        importNotes: vi.fn(),
        exportNotes: vi.fn(() => JSON.stringify([{ id: 'test-note' }])),
        activeNoteId: 'test-note',
        executionMode: 'cloud',
        setExecutionMode: vi.fn(),
        localExecutionAvailable: true,
        cloudExecutionEnabled: false,
        darkModeEnabled: false,
        toggleDarkMode: vi.fn(),
        isSidebarOpen: true,
        toggleSidebar: vi.fn(),
        isCreatingSandbox: false,
        isTerminalOpen: false,
        toggleTerminal: vi.fn(),
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
    };
    return {
        useNotesStore: vi.fn((selector) => selector ? selector(mockStore) : mockStore),
        createNewNote: vi.fn(() => ({ id: 'new-note', title: 'New Note' })),
    };
});

vi.mock('../../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('./Logo', () => ({
    Logo: () => <div data-testid="logo">Logo</div>,
}));

// Mock SyncStatusIcon since it has its own complex logic/state
vi.mock('./SyncStatusIcon', () => ({
    SyncStatusIcon: () => <div data-testid="sync-status-icon">Sync Status</div>,
}));

describe('Header Component', () => {
    const mockToggleMobileSidebar = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);
        expect(screen.getByText('Sandbooks')).toBeInTheDocument();
        expect(screen.getByTestId('logo')).toBeInTheDocument();
        expect(screen.getByTestId('sync-status-icon')).toBeInTheDocument();
    });

    it('handles dark mode toggle', async () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);

        const darkModeButton = screen.getByTitle('Switch to dark mode');
        fireEvent.click(darkModeButton);

        const { useNotesStore } = await import('../../store/notesStore');
        expect(useNotesStore().toggleDarkMode).toHaveBeenCalled();
    });

    it('handles new note creation', async () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);

        const newNoteButton = screen.getByTitle('New note (⌘N)');
        fireEvent.click(newNoteButton);

        const { useNotesStore } = await import('../../store/notesStore');
        expect(useNotesStore().addNote).toHaveBeenCalled();
    });

    it('handles sidebar toggle', async () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);

        const sidebarButton = screen.getByTitle('Hide sidebar (⌘B)');
        fireEvent.click(sidebarButton);

        const { useNotesStore } = await import('../../store/notesStore');
        expect(useNotesStore().toggleSidebar).toHaveBeenCalled();
    });

    it('handles mobile sidebar toggle', () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);

        const mobileSidebarButton = screen.getByLabelText('Toggle sidebar');
        fireEvent.click(mobileSidebarButton);

        expect(mockToggleMobileSidebar).toHaveBeenCalled();
    });

    it('handles terminal toggle', async () => {
        render(<Header onToggleMobileSidebar={mockToggleMobileSidebar} />);

        const terminalButton = screen.getByTitle('Open terminal (Ctrl+`)');
        fireEvent.click(terminalButton);

        const { useNotesStore } = await import('../../store/notesStore');
        expect(useNotesStore().toggleTerminal).toHaveBeenCalled();
    });
});
