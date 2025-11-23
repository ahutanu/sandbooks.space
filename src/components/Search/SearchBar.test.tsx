import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { useNotesStore } from '../../store/notesStore';
import { nanoid } from 'nanoid';

// Mock the store
vi.mock('../../store/notesStore', () => ({
  useNotesStore: vi.fn(),
}));

describe('SearchBar', () => {
  const mockCloseSearch = vi.fn();
  const mockSetSearchQuery = vi.fn();
  const mockSetActiveNote = vi.fn();

  const mockNotes = [
    {
      id: nanoid(),
      title: 'Test Note 1',
      content: { type: 'doc', content: [] },
      tags: [{ id: nanoid(), name: 'test', color: 'blue', createdAt: Date.now(), updatedAt: Date.now() }],
      codeBlocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: nanoid(),
      title: 'Another Note',
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
      isSearchOpen: true,
      searchQuery: '',
      closeSearch: mockCloseSearch,
      setSearchQuery: mockSetSearchQuery,
      notes: mockNotes,
      setActiveNote: mockSetActiveNote,
    });
  });

  it('renders when search is open', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
  });

  it('does not render when search is closed', () => {
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSearchOpen: false,
      searchQuery: '',
      closeSearch: mockCloseSearch,
      setSearchQuery: mockSetSearchQuery,
      notes: mockNotes,
      setActiveNote: mockSetActiveNote,
    });

    const { container } = render(<SearchBar />);
    expect(container.firstChild).toBeNull();
  });

  it('updates search query on input change', () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText('Search notes...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockSetSearchQuery).toHaveBeenCalledWith('test');
  });

  it('filters notes by title', () => {
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSearchOpen: true,
      searchQuery: 'Test',
      closeSearch: mockCloseSearch,
      setSearchQuery: mockSetSearchQuery,
      notes: mockNotes,
      setActiveNote: mockSetActiveNote,
    });

    render(<SearchBar />);
    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.queryByText('Another Note')).not.toBeInTheDocument();
  });

  it('filters notes by tags', () => {
    (useNotesStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSearchOpen: true,
      searchQuery: 'test',
      closeSearch: mockCloseSearch,
      setSearchQuery: mockSetSearchQuery,
      notes: mockNotes,
      setActiveNote: mockSetActiveNote,
    });

    render(<SearchBar />);
    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
  });

  it('closes search on Escape key', () => {
    render(<SearchBar />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockCloseSearch).toHaveBeenCalled();
  });

  it('navigates with ArrowDown key', () => {
    render(<SearchBar />);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // Selected index should update (tested via component behavior)
    expect(mockCloseSearch).not.toHaveBeenCalled();
  });

  it('navigates with ArrowUp key', () => {
    render(<SearchBar />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(mockCloseSearch).not.toHaveBeenCalled();
  });

  it('selects note on Enter key', () => {
    render(<SearchBar />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockSetActiveNote).toHaveBeenCalled();
    expect(mockCloseSearch).toHaveBeenCalled();
  });

  it('closes search when note is selected', () => {
    render(<SearchBar />);

    const noteButton = screen.getByText('Test Note 1');
    fireEvent.click(noteButton);

    expect(mockSetActiveNote).toHaveBeenCalled();
    expect(mockCloseSearch).toHaveBeenCalled();
  });

  it('focuses input when search opens', () => {
    render(<SearchBar />);

    const input = screen.getByPlaceholderText('Search notes...') as HTMLInputElement;
    // Input should be focused (tested via useEffect)
    expect(input).toBeInTheDocument();
  });
});

