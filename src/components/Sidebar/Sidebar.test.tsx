import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { useNotesStore } from '../../store/notesStore';

// Mock the store
vi.mock('../../store/notesStore', () => ({
  useNotesStore: vi.fn(),
}));

describe('Sidebar', () => {
  const mockSetActiveNote = vi.fn();
  const mockDeleteNote = vi.fn();
  const mockOnClose = vi.fn();
  const mockGetFolderTree = vi.fn(() => []);

  const mockNotes = [
    {
      id: 'note-1',
      title: 'First Note',
      content: { type: 'doc', content: [] },
      tags: [],
      codeBlocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: { type: 'doc', content: [] },
      tags: [],
      codeBlocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const createMockStore = (overrides = {}) => {
    const defaultState = {
      notes: mockNotes,
      activeNoteId: 'note-1',
      isSidebarOpen: true,
      setActiveNote: mockSetActiveNote,
      deleteNote: mockDeleteNote,
      // Folder-related properties needed by FolderTree
      folders: [],
      expandedFolderIds: new Set<string>(),
      activeFolderId: null,
      folderViewMode: 'flat',
      getFolderTree: mockGetFolderTree,
      toggleFolderExpanded: vi.fn(),
      setActiveFolder: vi.fn(),
      createFolder: vi.fn(),
      moveNoteToFolder: vi.fn(),
      deleteFolder: vi.fn(),
      updateFolder: vi.fn(),
      setFolderViewMode: vi.fn(),
      ...overrides,
    };

    // Return a function that handles both selector and direct access patterns
    return (selector?: (state: typeof defaultState) => unknown) => {
      if (typeof selector === 'function') {
        return selector(defaultState);
      }
      return defaultState;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      createMockStore()
    );
  });

  it('renders list of notes', () => {
    render(<Sidebar />);

    expect(screen.getByText('First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('highlights active note', () => {
    render(<Sidebar />);

    // NoteTreeItem renders as a div with role="treeitem" and aria-selected for active state
    const firstNote = screen.getByText('First Note').closest('[role="treeitem"]');
    expect(firstNote).toHaveAttribute('aria-selected', 'true');
  });

  it('calls setActiveNote when note is clicked', () => {
    render(<Sidebar />);

    // NoteTreeItem renders as a div with role="treeitem"
    const secondNote = screen.getByText('Second Note').closest('[role="treeitem"]');
    if (secondNote) {
      fireEvent.click(secondNote);
      expect(mockSetActiveNote).toHaveBeenCalledWith('note-2');
    }
  });

  it('opens delete confirmation when delete button is clicked', () => {
    render(<Sidebar />);

    // Delete button triggers a confirmation dialog before deletion
    const deleteButtons = screen.getAllByLabelText(/delete note/i);
    if (deleteButtons[0]) {
      fireEvent.click(deleteButtons[0]);
      // Verify the confirmation dialog opens (ConfirmDialog is rendered)
      expect(screen.getByText('Delete note?')).toBeInTheDocument();
    }
  });

  it('shows empty state when no notes', () => {
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      createMockStore({ notes: [], activeNoteId: null })
    );

    render(<Sidebar />);

    expect(screen.getByText('No notes yet')).toBeInTheDocument();
  });

  it('renders mobile close button when isMobile is true', () => {
    render(<Sidebar isMobile={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close sidebar');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render mobile close button when isMobile is false', () => {
    render(<Sidebar isMobile={false} />);

    expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument();
  });

  it('displays note timestamps', () => {
    render(<Sidebar />);

    // Timestamps should be rendered (formatTimestamp is tested separately)
    const timeElements = screen.getAllByRole('time');
    expect(timeElements.length).toBeGreaterThan(0);
  });
});

