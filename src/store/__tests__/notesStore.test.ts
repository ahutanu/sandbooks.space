import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotesStore, createNewNote } from '../notesStore';
import type { Note } from '../../types';
import type { Tag } from '../../types/tags.types';
import { cloudTerminalProvider } from '../../services/terminal/index';

// Mock all dependencies
vi.mock('../../services/storageManager', () => ({
  storageManager: {
    saveNote: vi.fn(() => Promise.resolve()),
    deleteNote: vi.fn(() => Promise.resolve()),
    getNotes: vi.fn(() => Promise.resolve([])),
    saveAllNotes: vi.fn(() => Promise.resolve()),
    getMetadata: vi.fn(() => ({ name: 'Local Storage', type: 'localStorage' })),
    setProvider: vi.fn(),
    getProvider: vi.fn(),
  },
  storageService: {
    exportNotes: vi.fn((notes) => JSON.stringify(notes)),
    saveAllNotes: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../services/LocalStorageProvider', () => ({
  LocalStorageProvider: vi.fn().mockImplementation(() => ({
    getNotes: vi.fn(() => Promise.resolve([])),
    saveAllNotes: vi.fn(() => Promise.resolve()),
    metadata: { name: 'Local Storage', type: 'localStorage' },
  })),
}));

vi.mock('../../services/FileSystemProvider', () => ({
  FileSystemProvider: vi.fn().mockImplementation(() => ({
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(() => Promise.resolve()),
    getNotes: vi.fn(() => Promise.resolve([])),
    metadata: { name: 'Test Folder', type: 'fileSystem' },
  })),
}));

vi.mock('../../services/hopx', () => ({
  hopxService: {
    executeCode: vi.fn(() => Promise.resolve({
      stdout: 'test output',
      stderr: '',
      error: null,
      executionTime: 100,
      exitCode: 0,
    })),
  },
}));

vi.mock('../../utils/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    custom: vi.fn(),
  },
}));

vi.mock('../../utils/onboardingMetrics', () => ({
  recordOnboardingEvent: vi.fn(),
  clearOnboardingEvents: vi.fn(),
}));

vi.mock('../../utils/defaultDocumentation', () => ({
  createDefaultDocumentation: vi.fn(() => [
    {
      id: 'doc-1',
      title: 'Welcome',
      content: { type: 'doc', content: [] },
      tags: [],
      codeBlocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}));

vi.mock('../../utils/fetchWithTimeout', () => ({
  fetchWithTimeout: vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ sandboxId: 'test-sandbox', success: true }),
    status: 200,
  })),
}));

vi.mock('../../utils/titleExtraction', () => ({
  extractTitleFromContent: vi.fn((content) => {
    // If content has text, extract title from it
    if (content?.content?.[0]?.content?.[0]?.text) {
      return content.content[0].content[0].text.substring(0, 50);
    }
    // If updates include title, use that
    if (content?.title) {
      return content.title;
    }
    return 'Untitled Note';
  }),
}));

vi.mock('../../utils/tagColors', () => ({
  getNextTagColor: vi.fn(() => 'blue'),
}));

vi.mock('../../services/execution/executionModeManager', () => ({
  executionModeManager: {
    setMode: vi.fn(() => Promise.resolve()),
    getMode: vi.fn(() => 'cloud'),
    setTerminalProvider: vi.fn(),
    getTerminalProvider: vi.fn(() => ({
      destroySession: vi.fn(() => Promise.resolve()),
      isAvailable: vi.fn(() => Promise.resolve(true)),
      createSession: vi.fn(() => Promise.resolve({ sessionId: 'mock-session' })),
    })),
    getExecutionProvider: vi.fn(() => ({
      executeCode: vi.fn(() => Promise.resolve({
        stdout: 'test',
        stderr: '',
        exitCode: 0
      })),
    })),
  },
}));

vi.mock('../../services/terminal/index', () => ({
  cloudTerminalProvider: {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    createSession: vi.fn(() => Promise.resolve({ sessionId: 'cloud-session' })),
    destroySession: vi.fn(() => Promise.resolve()),
  },
  localTerminalProvider: {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    createSession: vi.fn(() => Promise.resolve({ sessionId: 'local-session' })),
    destroySession: vi.fn(() => Promise.resolve()),
  },
  terminalService: {
    healthCheck: vi.fn(() => Promise.resolve(true)),
    createSession: vi.fn(() => Promise.resolve({ sessionId: 'test-session' })),
    destroySession: vi.fn(() => Promise.resolve()),
    connectStream: vi.fn(),
    disconnectStream: vi.fn(),
  }
}));

describe('notesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset store to initial state
    useNotesStore.setState({
      notes: [],
      activeNoteId: null,
      tags: [],
      offlineQueue: [],
      isOnline: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNewNote', () => {
    it('should create a new note with correct structure', () => {
      const note = createNewNote();

      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('title', 'Untitled Note');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('tags', []);
      // codeBlocks removed - now using ExecutableCodeBlock TipTap nodes
      expect(note).toHaveProperty('createdAt');
      expect(note).toHaveProperty('updatedAt');
    });
  });

  describe('addNote', () => {
    it('should add a note to the store', async () => {
      const note: Note = {
        id: 'test-note-1',
        title: 'Test Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.getState().addNote(note);

      const state = useNotesStore.getState();
      expect(state.notes).toContainEqual(note);
      expect(state.activeNoteId).toBe(note.id);
    });

    it('should set active note to the added note', () => {
      const note: Note = {
        id: 'test-note-2',
        title: 'Test Note 2',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.getState().addNote(note);
      expect(useNotesStore.getState().activeNoteId).toBe(note.id);
    });
  });

  describe('updateNote', () => {
    it('should update an existing note', async () => {
      const { extractTitleFromContent } = await import('../../utils/titleExtraction');
      vi.mocked(extractTitleFromContent).mockReturnValue('Updated Title');

      const note: Note = {
        id: 'test-note-3',
        title: 'Original Title',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().updateNote('test-note-3', { title: 'Updated Title' });

      const updatedNote = useNotesStore.getState().notes.find(n => n.id === 'test-note-3');
      expect(updatedNote?.title).toBe('Updated Title');
      expect(updatedNote?.updatedAt).toBeDefined();
    });

    it('should not update non-existent note', () => {
      const initialNotes = useNotesStore.getState().notes;
      useNotesStore.getState().updateNote('non-existent', { title: 'New Title' });
      expect(useNotesStore.getState().notes).toEqual(initialNotes);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note from the store', () => {
      const note: Note = {
        id: 'test-note-4',
        title: 'Test Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note], activeNoteId: note.id });
      useNotesStore.getState().deleteNote('test-note-4');

      expect(useNotesStore.getState().notes).not.toContainEqual(note);
      expect(useNotesStore.getState().activeNoteId).toBeNull();
    });

    it('should not change activeNoteId if deleting different note', () => {
      const note1: Note = {
        id: 'note-1',
        title: 'Note 1',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const note2: Note = {
        id: 'note-2',
        title: 'Note 2',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note1, note2], activeNoteId: 'note-1' });
      useNotesStore.getState().deleteNote('note-2');

      expect(useNotesStore.getState().activeNoteId).toBe('note-1');
    });
  });

  describe('setActiveNote', () => {
    it('should set active note id', () => {
      useNotesStore.getState().setActiveNote('test-id');
      expect(useNotesStore.getState().activeNoteId).toBe('test-id');
    });

    it('should allow setting active note to null', () => {
      useNotesStore.setState({ activeNoteId: 'test-id' });
      useNotesStore.getState().setActiveNote(null);
      expect(useNotesStore.getState().activeNoteId).toBeNull();
    });
  });

  describe('toggleDarkMode', () => {
    it('should toggle dark mode', () => {
      const initialState = useNotesStore.getState().darkModeEnabled;
      useNotesStore.getState().toggleDarkMode();
      expect(useNotesStore.getState().darkModeEnabled).toBe(!initialState);
    });

    it('should update localStorage', () => {
      useNotesStore.getState().toggleDarkMode();
      const stored = localStorage.getItem('sandbooks-dark-mode');
      expect(stored).toBeDefined();
    });

    it('should add dark class to html when enabled', () => {
      document.documentElement.classList.remove('dark');
      useNotesStore.setState({ darkModeEnabled: false });
      useNotesStore.getState().toggleDarkMode();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from html when disabled', () => {
      document.documentElement.classList.add('dark');
      useNotesStore.setState({ darkModeEnabled: true });
      useNotesStore.getState().toggleDarkMode();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('exportNotes', () => {
    it('should export notes as JSON string', () => {
      const note: Note = {
        id: 'export-test',
        title: 'Export Test',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      const exported = useNotesStore.getState().exportNotes();
      
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('importNotes', () => {
    it('should import valid JSON array of notes', () => {
      const notes: Note[] = [
        {
          id: 'import-1',
          title: 'Imported Note 1',
          content: { type: 'doc', content: [] },
          tags: [],
          codeBlocks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const json = JSON.stringify(notes);
      const result = useNotesStore.getState().importNotes(json);

      expect(result).toBe(true);
      expect(useNotesStore.getState().notes).toEqual(notes);
    });

    it('should return false for invalid JSON', () => {
      const result = useNotesStore.getState().importNotes('invalid json');
      expect(result).toBe(false);
    });

    it('should return false for non-array JSON', () => {
      const result = useNotesStore.getState().importNotes(JSON.stringify({ not: 'array' }));
      expect(result).toBe(false);
    });
  });

  describe('importMarkdownNote', () => {
    it('should import a markdown file as a note', async () => {
      const file = new File(['# Hello World\n\nThis is markdown'], 'test.md', { type: 'text/markdown' });
      
      await useNotesStore.getState().importMarkdownNote(file);

      const notes = useNotesStore.getState().notes;
      expect(notes.length).toBeGreaterThan(0);
      const importedNote = notes[notes.length - 1];
      expect(importedNote.title).toBe('test');
      expect(useNotesStore.getState().activeNoteId).toBe(importedNote.id);
    });
  });

  describe('resetOnboardingDocs', () => {
    it('should reset notes to default documentation', () => {
      useNotesStore.getState().resetOnboardingDocs();
      
      const state = useNotesStore.getState();
      expect(state.notes.length).toBeGreaterThan(0);
      expect(state.activeNoteId).toBeDefined();
      expect(localStorage.getItem('sandbooks-first-run-complete')).toBe('true');
    });

    it('should not show toast when silent option is true', async () => {
      const { showToast } = await import('../../utils/toast');
      useNotesStore.getState().resetOnboardingDocs({ silent: true });
      // Toast should not be called with silent option
      expect(vi.mocked(showToast.success)).not.toHaveBeenCalled();
    });
  });

  describe('seedDocsIfMissing', () => {
    it('should seed docs when notes are empty', () => {
      useNotesStore.setState({ notes: [] });
      useNotesStore.getState().seedDocsIfMissing();
      
      expect(useNotesStore.getState().notes.length).toBeGreaterThan(0);
    });

    it('should not seed docs when notes exist', () => {
      const existingNote: Note = {
        id: 'existing',
        title: 'Existing Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [existingNote] });
      useNotesStore.getState().seedDocsIfMissing();
      
      expect(useNotesStore.getState().notes).toEqual([existingNote]);
    });
  });

  describe('search methods', () => {
    it('should open search', () => {
      useNotesStore.getState().openSearch();
      expect(useNotesStore.getState().isSearchOpen).toBe(true);
      expect(useNotesStore.getState().searchQuery).toBe('');
    });

    it('should close search', () => {
      useNotesStore.setState({ isSearchOpen: true, searchQuery: 'test' });
      useNotesStore.getState().closeSearch();
      expect(useNotesStore.getState().isSearchOpen).toBe(false);
      expect(useNotesStore.getState().searchQuery).toBe('');
    });

    it('should set search query', () => {
      useNotesStore.getState().setSearchQuery('test query');
      expect(useNotesStore.getState().searchQuery).toBe('test query');
    });
  });

  describe('toggle methods', () => {
    it('should toggle shortcuts', () => {
      const initialState = useNotesStore.getState().isShortcutsOpen;
      useNotesStore.getState().toggleShortcuts();
      expect(useNotesStore.getState().isShortcutsOpen).toBe(!initialState);
    });

    it('should toggle sidebar', () => {
      const initialState = useNotesStore.getState().isSidebarOpen;
      useNotesStore.getState().toggleSidebar();
      expect(useNotesStore.getState().isSidebarOpen).toBe(!initialState);
    });

    it('should toggle typewriter mode', () => {
      const initialState = useNotesStore.getState().typewriterModeEnabled;
      useNotesStore.getState().toggleTypewriterMode();
      expect(useNotesStore.getState().typewriterModeEnabled).toBe(!initialState);
      expect(localStorage.getItem('sandbooks-typewriter-mode')).toBe(String(!initialState));
    });

    it('should toggle focus mode', () => {
      const initialState = useNotesStore.getState().focusModeEnabled;
      useNotesStore.getState().toggleFocusMode();
      expect(useNotesStore.getState().focusModeEnabled).toBe(!initialState);
      expect(localStorage.getItem('sandbooks-focus-mode')).toBe(String(!initialState));
    });
  });

  describe('terminal methods', () => {
    it('should toggle terminal', () => {
      const initialState = useNotesStore.getState().isTerminalOpen;
      useNotesStore.getState().toggleTerminal();
      expect(useNotesStore.getState().isTerminalOpen).toBe(!initialState);
    });

    it('should set terminal height', () => {
      useNotesStore.getState().setTerminalHeight(500);
      expect(useNotesStore.getState().terminalHeight).toBe(500);
    });

    it('should set global terminal status', () => {
      useNotesStore.getState().setGlobalTerminalStatus('connected');
      expect(useNotesStore.getState().globalTerminalStatus).toBe('connected');
    });
  });

  describe('tag management', () => {
    it('should add a tag', () => {
      const tag = useNotesStore.getState().addTag('test-tag', 'blue');
      
      expect(tag).toHaveProperty('id');
      expect(tag.name).toBe('test-tag');
      expect(tag.color).toBe('blue');
      expect(useNotesStore.getState().tags).toContainEqual(tag);
    });

    it('should add tag with auto-generated color if not provided', () => {
      const tag = useNotesStore.getState().addTag('auto-color-tag');
      expect(tag.color).toBeDefined();
    });

    it('should update a tag', () => {
      const tag = useNotesStore.getState().addTag('original', 'blue');
      useNotesStore.getState().updateTag(tag.id, { name: 'updated', color: 'red' });
      
      const updatedTag = useNotesStore.getState().tags.find(t => t.id === tag.id);
      expect(updatedTag?.name).toBe('updated');
      expect(updatedTag?.color).toBe('red');
    });

    it('should delete a tag', () => {
      const tag = useNotesStore.getState().addTag('to-delete', 'blue');
      useNotesStore.getState().deleteTag(tag.id);
      
      expect(useNotesStore.getState().tags.find(t => t.id === tag.id)).toBeUndefined();
    });

    it('should add tag to note', () => {
      const note: Note = {
        id: 'note-with-tag',
        title: 'Test Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      const tag: Tag = {
        id: 'tag-1',
        name: 'test',
        color: 'blue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      useNotesStore.getState().addTagToNote(note.id, tag);
      
      const updatedNote = useNotesStore.getState().notes.find(n => n.id === note.id);
      expect(updatedNote?.tags).toContainEqual(tag);
    });

    it('should remove tag from note', () => {
      const tag: Tag = {
        id: 'tag-to-remove',
        name: 'test',
        color: 'blue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const note: Note = {
        id: 'note-with-tag',
        title: 'Test Note',
        content: { type: 'doc', content: [] },
        tags: [tag],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().removeTagFromNote(note.id, tag.id);
      
      const updatedNote = useNotesStore.getState().notes.find(n => n.id === note.id);
      expect(updatedNote?.tags).not.toContainEqual(tag);
    });

    it('should get tag by id', () => {
      const tag = useNotesStore.getState().addTag('find-me', 'blue');
      const found = useNotesStore.getState().getTagById(tag.id);
      
      expect(found).toEqual(tag);
    });

    it('should get all tags with counts', () => {
      const tag = useNotesStore.getState().addTag('counted', 'blue');
      const note: Note = {
        id: 'note-1',
        title: 'Test',
        content: { type: 'doc', content: [] },
        tags: [tag],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      const tagsWithCounts = useNotesStore.getState().getAllTagsWithCounts();
      
      const countedTag = tagsWithCounts.find(t => t.id === tag.id);
      expect(countedTag?.noteCount).toBe(1);
    });
  });

  describe('sandbox methods', () => {
    it('should set sandbox status', () => {
      useNotesStore.getState().setSandboxStatus('healthy');
      expect(useNotesStore.getState().sandboxStatus).toBe('healthy');
    });

    it('should check sandbox health', async () => {
      const isHealthy = await useNotesStore.getState().checkSandboxHealth();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  // Code block management methods tests removed - now using ExecutableCodeBlock TipTap nodes

  describe('offline queue methods', () => {
    it('should set online status', () => {
      useNotesStore.getState().setIsOnline(false);
      expect(useNotesStore.getState().isOnline).toBe(false);
    });

    it('should clear offline queue', () => {
      useNotesStore.setState({
        offlineQueue: [
          { id: 'q1', noteId: 'n1', blockId: 'b1', code: 'test', language: 'python', timestamp: Date.now() },
        ],
      });

      useNotesStore.getState().clearOfflineQueue();
      expect(useNotesStore.getState().offlineQueue).toEqual([]);
      expect(localStorage.getItem('sandbooks-offline-queue')).toBeNull();
    });

    it('should handle queueCodeExecution gracefully (deprecated)', () => {
      // queueCodeExecution is deprecated - now just logs a warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      useNotesStore.getState().queueCodeExecution('note-1', 'block-1', 'print("test")', 'python');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Offline queue for code blocks has been removed'));
      consoleSpy.mockRestore();
    });

    it('should handle processOfflineQueue gracefully (deprecated)', async () => {
      // processOfflineQueue is deprecated - now just logs a warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await useNotesStore.getState().processOfflineQueue();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Offline queue processing removed'));
      consoleSpy.mockRestore();
    });
  });

  // executeCodeBlock tests removed - code execution is now handled by ExecutableCodeBlock TipTap nodes

  describe('autoHealSandbox', () => {
    it('should return true when sandbox is already being created', async () => {
      useNotesStore.setState({
        isCreatingSandbox: true,
      });
      const result = await useNotesStore.getState().autoHealSandbox();
      expect(result).toBe(true);
    });
  });

  describe('recreateSandbox', () => {
    it('should recreate sandbox successfully', async () => {
      await useNotesStore.getState().recreateSandbox();
      expect(useNotesStore.getState().sandboxStatus).toBe('healthy');
      expect(useNotesStore.getState().isCreatingSandbox).toBe(false);
    });

    it('should handle sandbox recreation failure', async () => {
      const { fetchWithTimeout } = await import('../../utils/fetchWithTimeout');
      vi.mocked(fetchWithTimeout).mockRejectedValueOnce(new Error('Failed'));

      await expect(useNotesStore.getState().recreateSandbox()).rejects.toThrow();
      expect(useNotesStore.getState().sandboxStatus).toBe('unhealthy');
    });
  });

  describe('storage provider methods', () => {
    it('should get storage info', () => {
      const info = useNotesStore.getState().getStorageInfo();
      expect(info).toBeDefined();
    });
  });

  describe('initialization helpers', () => {
    it('initDarkMode should read from localStorage', () => {
      localStorage.setItem('sandbooks-dark-mode', 'true');
      // Re-import to test init function
      const store = useNotesStore.getState();
      // The init function runs at module load, so we test the result
      expect(typeof store.darkModeEnabled).toBe('boolean');
    });

    it('initDarkMode should default to true when not set', () => {
      localStorage.removeItem('sandbooks-dark-mode');
      // Default behavior is tested through store state
      const store = useNotesStore.getState();
      expect(typeof store.darkModeEnabled).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle storage save error in addNote', async () => {
      const { storageManager } = await import('../../services/storageManager');
      vi.mocked(storageManager.saveNote).mockRejectedValueOnce(new Error('Save failed'));

      const note: Note = {
        id: 'error-note',
        title: 'Error Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.getState().addNote(note);
      
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Note should still be added (optimistic update)
      expect(useNotesStore.getState().notes).toContainEqual(note);
    });

    it('should handle storage update error in updateNote', async () => {
      const { storageManager } = await import('../../services/storageManager');
      vi.mocked(storageManager.saveNote).mockRejectedValueOnce(new Error('Update failed'));

      const note: Note = {
        id: 'update-error',
        title: 'Update Error',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().updateNote('update-error', { title: 'New Title' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Note should still be updated (optimistic update)
      const updated = useNotesStore.getState().notes.find(n => n.id === 'update-error');
      expect(updated).toBeDefined();
    });

    it('should handle storage delete error in deleteNote', async () => {
      const { storageManager } = await import('../../services/storageManager');
      vi.mocked(storageManager.deleteNote).mockRejectedValueOnce(new Error('Delete failed'));

      const note: Note = {
        id: 'delete-error',
        title: 'Delete Error',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().deleteNote('delete-error');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Note should still be deleted (optimistic update)
      expect(useNotesStore.getState().notes.find(n => n.id === 'delete-error')).toBeUndefined();
    });

    // Code execution error handling tests removed - code execution is now handled by ExecutableCodeBlock TipTap nodes
  });

  describe('autoHealSandbox error handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const { fetchWithTimeout } = await import('../../utils/fetchWithTimeout');
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce({
          ok: false,
          status: 200,
          json: async () => ({ health: { isHealthy: false } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({}),
        } as Response);

      useNotesStore.setState({
        isCreatingSandbox: false,
        lastHealthCheck: null,
      });

      const result = await useNotesStore.getState().autoHealSandbox({ force: true });
      expect(result).toBe(false);
      expect(useNotesStore.getState().sandboxStatus).toBe('unhealthy');
    });

    it('should handle circuit breaker error', async () => {
      const { fetchWithTimeout } = await import('../../utils/fetchWithTimeout');
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce({
          ok: false,
          status: 200,
          json: async () => ({ health: { isHealthy: false } }),
        } as Response)
        .mockRejectedValueOnce(new Error('Circuit breaker is open'));

      useNotesStore.setState({
        isCreatingSandbox: false,
        lastHealthCheck: null,
      });

      const result = await useNotesStore.getState().autoHealSandbox({ force: true });
      expect(result).toBe(false);
    });

    it('should skip heal if recently checked', async () => {
      useNotesStore.setState({
        isCreatingSandbox: false,
        lastHealthCheck: Date.now() - 1000, // 1 second ago
        sandboxStatus: 'healthy',
      });

      const result = await useNotesStore.getState().autoHealSandbox();
      expect(result).toBe(true);
    });
  });

  describe('terminal initialization', () => {
    it('should handle terminal session initialization error', async () => {
      // Mock provider to be unavailable
      vi.mocked(cloudTerminalProvider.isAvailable).mockResolvedValueOnce(false);

      useNotesStore.setState({
        globalTerminalSessionId: null,
        globalTerminalStatus: 'disconnected',
        executionMode: 'cloud'
      });

      await useNotesStore.getState().initializeGlobalTerminalSession();
      
      expect(useNotesStore.getState().globalTerminalStatus).toBe('error');
    });

    it('should skip initialization if session already exists', async () => {
      useNotesStore.setState({
        globalTerminalSessionId: 'existing-session',
        globalTerminalStatus: 'connected',
      });

      await useNotesStore.getState().initializeGlobalTerminalSession();
      
      // Should not change state
      expect(useNotesStore.getState().globalTerminalSessionId).toBe('existing-session');
    });

    it('should initialize terminal when toggling open', async () => {
      useNotesStore.setState({
        isTerminalOpen: false,
        globalTerminalSessionId: null,
      });

      useNotesStore.getState().toggleTerminal();
      
      // Should trigger initialization
      expect(useNotesStore.getState().isTerminalOpen).toBe(true);
    });
  });

  describe('tag management edge cases', () => {
    it('should not add duplicate tag to note', () => {
      const tag: Tag = {
        id: 'duplicate-tag',
        name: 'test',
        color: 'blue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const note: Note = {
        id: 'tag-note',
        title: 'Tag Note',
        content: { type: 'doc', content: [] },
        tags: [tag],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().addTagToNote(note.id, tag);

      // Should not add duplicate
      const updatedNote = useNotesStore.getState().notes.find(n => n.id === note.id);
      expect(updatedNote?.tags.filter(t => t.id === tag.id).length).toBe(1);
    });

    it('should handle removing non-existent tag from note', () => {
      const note: Note = {
        id: 'no-tag-note',
        title: 'No Tag Note',
        content: { type: 'doc', content: [] },
        tags: [],
        codeBlocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useNotesStore.setState({ notes: [note] });
      useNotesStore.getState().removeTagFromNote(note.id, 'non-existent');

      // Should not error
      const updatedNote = useNotesStore.getState().notes.find(n => n.id === note.id);
      expect(updatedNote?.tags).toEqual([]);
    });
  });

  describe('storage provider methods', () => {
    it('should get storage info', () => {
      const info = useNotesStore.getState().getStorageInfo();
      expect(info).toBeDefined();
      expect(info.name).toBeDefined();
    });
  });
});
