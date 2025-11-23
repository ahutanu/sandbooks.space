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

  beforeEach(() => {
    vi.clearAllMocks();
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      notes: mockNotes,
      activeNoteId: 'note-1',
      isSidebarOpen: true,
      setActiveNote: mockSetActiveNote,
      deleteNote: mockDeleteNote,
    });
  });

  it('renders list of notes', () => {
    render(<Sidebar />);

    expect(screen.getByText('First Note')).toBeInTheDocument();
    expect(screen.getByText('Second Note')).toBeInTheDocument();
  });

  it('highlights active note', () => {
    render(<Sidebar />);

    const firstNote = screen.getByText('First Note').closest('button');
    expect(firstNote).toHaveAttribute('aria-current', 'true');
  });

  it('calls setActiveNote when note is clicked', () => {
    render(<Sidebar />);

    const secondNote = screen.getByText('Second Note').closest('button');
    if (secondNote) {
      fireEvent.click(secondNote);
      expect(mockSetActiveNote).toHaveBeenCalledWith('note-2');
    }
  });

  it('calls deleteNote when delete button is clicked', () => {
    render(<Sidebar />);

    const deleteButtons = screen.getAllByLabelText(/delete note/i);
    if (deleteButtons[0]) {
      fireEvent.click(deleteButtons[0]);
      expect(mockDeleteNote).toHaveBeenCalled();
    }
  });

  it('shows empty state when no notes', () => {
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      notes: [],
      activeNoteId: null,
      isSidebarOpen: true,
      setActiveNote: mockSetActiveNote,
      deleteNote: mockDeleteNote,
    });

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

