import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusIcon } from '../SyncStatusIcon';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useNotesStore } from '../../../store/notesStore';
import { parseIpynb, convertIpynbToNote } from '../../../utils/ipynb';

// Mocks
vi.mock('../../../store/notesStore', () => {
    const mockStore = {
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
        importNotes: vi.fn(),
        exportNotes: vi.fn(),
        notes: [{ id: 'test-note', title: 'Test Note', content: 'test content' }],
        addNote: vi.fn(),
        storageType: 'local',
        storageName: 'Local Storage',
        activeNoteId: 'test-note',
        importMarkdownNote: vi.fn(),
    };
    const useNotesStoreMock = vi.fn((selector) => selector ? selector(mockStore) : mockStore);
    // Add getState for components that use useNotesStore.getState()
    useNotesStoreMock.getState = () => mockStore;
    return {
        useNotesStore: useNotesStoreMock,
    };
});

vi.mock('../../../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
    },
}));

vi.mock('../../../utils/ipynb', () => ({
    parseIpynb: vi.fn(),
    convertIpynbToNote: vi.fn(),
}));

vi.mock('../../FileSystemSync/FileSystemSync', () => ({
    FileSystemSync: () => <div data-testid="fs-sync">FS Sync</div>,
}));

describe('SyncStatusIcon Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<SyncStatusIcon />);
        expect(screen.getByLabelText(/Sync status/i)).toBeInTheDocument();
    });

    it('opens popover on click', () => {
        render(<SyncStatusIcon />);
        const button = screen.getByLabelText(/Sync status/i);
        fireEvent.click(button);
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
        expect(screen.getByText('Import Jupyter Notebook')).toBeInTheDocument();
    });

    it('handles Jupyter Notebook import', async () => {
        const mockFile = new File(['{}'], 'notebook.ipynb', { type: 'application/json' });
        const mockNotebook = { cells: [] };
        const mockNote = { id: 'new-note', title: 'notebook', content: '' };

        (parseIpynb as ReturnType<typeof vi.fn>).mockResolvedValue(mockNotebook);
        (convertIpynbToNote as ReturnType<typeof vi.fn>).mockReturnValue(mockNote);

        const { container } = render(<SyncStatusIcon />);

        // Open popover
        fireEvent.click(screen.getByLabelText(/Sync status/i));

        // Find the Jupyter notebook input by its accept attribute
        const input = container.querySelector('input[accept=".ipynb"]');
        expect(input).toBeInTheDocument();

        if (input) {
            fireEvent.change(input, { target: { files: [mockFile] } });
        }

        await waitFor(() => {
            expect(parseIpynb).toHaveBeenCalledWith(mockFile);
            expect(convertIpynbToNote).toHaveBeenCalledWith(mockNotebook, 'notebook.ipynb');
            expect(useNotesStore().addNote).toHaveBeenCalledWith(mockNote);
        });
    });
});
