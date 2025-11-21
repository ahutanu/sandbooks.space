import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../../store/notesStore';
import type { Note } from '../../types';

export const SearchBar = () => {
  const { isSearchOpen, searchQuery, closeSearch, setSearchQuery, notes, setActiveNote } = useNotesStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Filter notes based on search query
  const filteredNotes = searchQuery
    ? notes.filter((note) => {
        const query = searchQuery.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(query);
        // Search in content (simplified - check paragraphs and code blocks)
        const contentText = JSON.stringify(note.content).toLowerCase();
        const contentMatch = contentText.includes(query);
        // Search in tags
        const tagsMatch = (note.tags ?? []).some((tag) =>
          tag.name.toLowerCase().includes(query)
        );
        return titleMatch || contentMatch || tagsMatch;
      })
    : notes;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredNotes.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredNotes[selectedIndex]) {
            setActiveNote(filteredNotes[selectedIndex].id);
            closeSearch();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, filteredNotes, selectedIndex, setActiveNote, closeSearch]);

  // Reset selected index when query changes
  useEffect(() => {
    if (selectedIndex !== 0) {
      setSelectedIndex(0);
    }
  }, [searchQuery, selectedIndex]);

  if (!isSearchOpen) return null;

  const handleSelectNote = (note: Note) => {
    setActiveNote(note.id);
    closeSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 glass-backdrop animate-fadeIn">
      <div className="w-full max-w-2xl mx-4 glass-modal rounded-2xl shadow-elevation-5 overflow-hidden animate-scaleIn">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-200 dark:border-stone-700">
          {/* Search Icon */}
          <svg className="w-5 h-5 text-stone-400 dark:text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent text-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none"
            aria-label="Search notes"
          />

          <button
            onClick={closeSearch}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
            aria-label="Close search (Esc)"
          >
            <kbd className="px-2 py-1 text-xs font-semibold bg-stone-100 dark:bg-stone-700 rounded">Esc</kbd>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
              {searchQuery ? 'No notes found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="py-2">
              {filteredNotes.map((note, index) => {
                const isSelected = index === selectedIndex;
                const highlightedTitle = note.title;

                return (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`w-full text-left px-6 py-3 transition-all border-l-4 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-700/50 border-transparent'
                    }`}
                    aria-label={`Select note: ${note.title}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-base font-semibold truncate ${
                            isSelected
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {highlightedTitle}
                        </h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                          {new Date(note.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      {isSelected && (
                        <kbd className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 rounded">
                          ↵
                        </kbd>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        {filteredNotes.length > 0 && (
          <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-700 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
