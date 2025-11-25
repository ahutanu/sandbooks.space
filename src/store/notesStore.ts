import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { NotesStore, Note } from '../types';
import type { Tag, TagColor } from '../types/tags.types';
import { LocalStorageProvider } from '../services/LocalStorageProvider';
import { FileSystemProvider } from '../services/FileSystemProvider';
import { storageManager, storageService } from '../services/storageManager';
import { extractTitleFromContent } from '../utils/titleExtraction';
import { getNextTagColor } from '../utils/tagColors';
import { showToast as toast } from '../utils/toast';
import { createDefaultDocumentation } from '../utils/defaultDocumentation';
import { recordOnboardingEvent, clearOnboardingEvents } from '../utils/onboardingMetrics';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { cloudTerminalProvider } from '../services/terminal/index';

// Initialize dark mode from localStorage or system preference
const initDarkMode = (): boolean => {
  const stored = localStorage.getItem('sandbooks-dark-mode');
  if (stored !== null) {
    return stored === 'true';
  }
  // Default to dark mode 
  return true;
};

// Initialize typewriter mode from localStorage
const initTypewriterMode = (): boolean => {
  const stored = localStorage.getItem('sandbooks-typewriter-mode');
  return stored === 'true'; // Default to false if not set
};

// Initialize focus mode from localStorage (default: false)
const initFocusMode = (): boolean => {
  const stored = localStorage.getItem('sandbooks-focus-mode');
  return stored === 'true';
};

// API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;
const AUTH_HEADERS = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined;

// Normalize tags into the global tag list so color edits stay consistent
const deriveTagsFromNotes = (notes: Note[]): Tag[] => {
  const byName = new Map<string, Tag>();
  notes.forEach((note) => {
    note.tags?.forEach((tag) => {
      const key = tag.name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { ...tag, id: tag.id || nanoid() });
      }
    });
  });
  return Array.from(byName.values());
};

// Initialize with empty state - will load async after store creation
const initialNotes: Note[] = [];
const initialTags: Tag[] = [];
const initialActiveNoteId: string | null = null;

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: initialNotes,
  // Auto-select first note on first launch
  activeNoteId: initialActiveNoteId,
  darkModeEnabled: initDarkMode(),
  isSearchOpen: false,
  searchQuery: '',
  isShortcutsOpen: false,
  isSidebarOpen: true, // Sidebar visible by default
  typewriterModeEnabled: initTypewriterMode(), // Typewriter mode from localStorage
  focusModeEnabled: initFocusMode(), // Focus mode from localStorage
  tags: initialTags, // All unique tags
  // Terminal state (GLOBAL - single session for entire app)
  isTerminalOpen: false,
  terminalHeight: 400, // Default height in pixels
  globalTerminalSessionId: null,
  globalTerminalStatus: 'disconnected',
  // Sandbox state (ephemeral - not persisted to localStorage)
  sandboxStatus: 'unknown',
  sandboxId: null,
  lastHealthCheck: null,
  retryCount: 0,
  isCreatingSandbox: false,
  syncStatus: 'synced',
  lastSyncedAt: null,
  storageType: 'localStorage',
  storageName: 'Local Storage',
  // Offline queue state
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  offlineQueue: [],

  addNote: (note: Note) => {
    set((state) => {
      const newNotes = [...state.notes, note];

      set({ syncStatus: 'saving' });

      storageManager.saveNote(note)
        .then(() => {
          set({
            syncStatus: 'synced',
            lastSyncedAt: new Date().toISOString()
          });
        })
        .catch(err => {
          console.error('Failed to save note:', err);
          toast.error('Failed to save note');
          set({ syncStatus: 'error' });
        });

      return {
        notes: newNotes,
        activeNoteId: note.id
      };
    });
  },

  updateNote: (id: string, updates: Partial<Note>) => {
    set((state) => {
      let updatedNote: Note | undefined;
      const newNotes = state.notes.map((note) => {
        if (note.id === id) {
          const updatedContent = updates.content || note.content;
          const computedTitle = extractTitleFromContent(updatedContent);

          updatedNote = {
            ...note,
            ...updates,
            title: computedTitle,
            updatedAt: new Date().toISOString()
          };
          return updatedNote;
        }
        return note;
      });

      if (updatedNote) {
        set({ syncStatus: 'saving' });

        storageManager.saveNote(updatedNote)
          .then(() => {
            set({
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString()
            });
          })
          .catch(err => {
            console.error('Failed to update note:', err);
            toast.error('Failed to save changes');
            set({ syncStatus: 'error' });
          });
      }

      return { notes: newNotes };
    });
  },

  deleteNote: (id: string) => {
    set((state) => {
      const newNotes = state.notes.filter((note) => note.id !== id);

      set({ syncStatus: 'saving' });

      storageManager.deleteNote(id)
        .then(() => {
          set({
            syncStatus: 'synced',
            lastSyncedAt: new Date().toISOString()
          });
        })
        .catch(err => {
          console.error('Failed to delete note:', err);
          toast.error('Failed to delete note');
          set({ syncStatus: 'error' });
        });

      return {
        notes: newNotes,
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId
      };
    });
  },

  setActiveNote: (id: string | null) => {
    set({ activeNoteId: id });
  },

  toggleDarkMode: () => {
    set((state) => {
      const newValue = !state.darkModeEnabled;
      localStorage.setItem('sandbooks-dark-mode', String(newValue));

      // Toggle dark class on html element
      if (newValue) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      return { darkModeEnabled: newValue };
    });
  },

  exportNotes: () => {
    const notes = get().notes;
    recordOnboardingEvent('notes_exported', { count: notes.length });
    return storageService.exportNotes(notes);
  },

  importNotes: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        set({ notes: data });
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import notes', e);
      return false;
    }
  },

  importMarkdownNote: async (file: File) => {
    const content = await file.text();
    const newNote: Note = {
      id: nanoid(),
      title: file.name.replace('.md', ''),
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: content }]
          }
        ]
      },
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ notes: [...state.notes, newNote], activeNoteId: newNote.id }));
    toast.success('Markdown note imported');
    recordOnboardingEvent('markdown_imported');
  },

  resetOnboardingDocs: (options) => {
    const docs = createDefaultDocumentation();
    storageService.saveAllNotes(docs);
    localStorage.setItem('sandbooks-first-run-complete', 'true');
    clearOnboardingEvents();
    set({
      notes: docs,
      activeNoteId: docs[0]?.id ?? null,
      tags: deriveTagsFromNotes(docs),
    });
    recordOnboardingEvent('docs_reset', {
      source: options?.source ?? 'manual',
      notesCount: docs.length,
    });
    if (!options?.silent) {
      toast.success('Notes reset to the built-in tour.');
    }
  },

  seedDocsIfMissing: () => {
    const currentNotes = get().notes;
    if (currentNotes.length > 0) return;
    const docs = createDefaultDocumentation();
    storageService.saveAllNotes(docs);
    localStorage.setItem('sandbooks-first-run-complete', 'true');
    set({
      notes: docs,
      activeNoteId: docs[0]?.id ?? null,
      tags: deriveTagsFromNotes(docs),
    });
    recordOnboardingEvent('docs_reset', { source: 'auto-empty', notesCount: docs.length });
  },

  openSearch: () => {
    set({ isSearchOpen: true, searchQuery: '' });
    recordOnboardingEvent('search_opened');
  },

  closeSearch: () => {
    set({ isSearchOpen: false, searchQuery: '' });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  toggleShortcuts: () => {
    set((state) => ({ isShortcutsOpen: !state.isShortcutsOpen }));
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  toggleTypewriterMode: () => {
    set((state) => {
      const newValue = !state.typewriterModeEnabled;
      localStorage.setItem('sandbooks-typewriter-mode', String(newValue));
      return { typewriterModeEnabled: newValue };
    });
  },

  toggleFocusMode: () => {
    set((state) => {
      const newValue = !state.focusModeEnabled;
      localStorage.setItem('sandbooks-focus-mode', String(newValue));
      return { focusModeEnabled: newValue };
    });
  },

  // Terminal management methods (GLOBAL SESSION)
  toggleTerminal: () => {
    set((state) => {
      const nextOpen = !state.isTerminalOpen;
      // If opening and no active session, kick off session initialization
      if (nextOpen && !state.globalTerminalSessionId) {
        // fire-and-forget; errors handled inside initializer
        get().initializeGlobalTerminalSession();
      }
      recordOnboardingEvent('terminal_toggled', { open: nextOpen });
      return { isTerminalOpen: nextOpen };
    });
  },

  setTerminalHeight: (height: number) => {
    set({ terminalHeight: height });
  },

  // Initialize global terminal session (called on app mount)
  initializeGlobalTerminalSession: async () => {
    const currentState = get();

    // Prevent duplicate session creation - only create if no session exists
    if (currentState.globalTerminalSessionId && currentState.globalTerminalStatus !== 'error') {
      return;
    }

    // Prevent concurrent initialization (React Strict Mode double-render protection)
    if (currentState.globalTerminalStatus === 'connecting') {
      return;
    }

    try {
      set({ globalTerminalStatus: 'connecting' });

      // Check if cloud terminal provider is available
      const available = await cloudTerminalProvider.isAvailable();
      if (!available) {
        throw new Error('Cloud terminal provider is not available');
      }

      // Create session using cloud terminal provider
      const session = await cloudTerminalProvider.createSession();

      set({
        globalTerminalSessionId: session.sessionId,
        globalTerminalStatus: 'connecting',
      });
    } catch (error) {
      console.error('[Store] Failed to initialize global terminal session:', error);
      set({
        globalTerminalStatus: 'error',
        globalTerminalSessionId: null
      });
      // Don't show error toast - let user discover terminal naturally when they open it
      // Error state is already reflected in globalTerminalStatus
    }
  },

  // Update global terminal status
  setGlobalTerminalStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
    set({ globalTerminalStatus: status });
  },

  // Tag management methods
  addTag: (name: string, color?: TagColor) => {
    const newTag: Tag = {
      id: nanoid(),
      name: name.trim(),
      color: color || getNextTagColor(get().tags),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      tags: [...state.tags, newTag],
    }));

    return newTag;
  },

  updateTag: (id: string, updates: Partial<Tag>) => {
    set((state) => {
      const newTags = state.tags.map((tag) =>
        tag.id === id ? { ...tag, ...updates, updatedAt: Date.now() } : tag
      );

      // Also update tag in all notes
      const newNotes = state.notes.map((note) => ({
        ...note,
        tags: note.tags?.map((tag) =>
          tag.id === id ? { ...tag, ...updates, updatedAt: Date.now() } : tag
        ),
      }));

      storageService.saveAllNotes(newNotes);

      return {
        tags: newTags,
        notes: newNotes,
      };
    });
  },

  deleteTag: (id: string) => {
    set((state) => {
      // Remove tag from all notes
      const newNotes = state.notes.map((note) => ({
        ...note,
        tags: note.tags?.filter((tag) => tag.id !== id) || [],
      }));

      storageService.saveAllNotes(newNotes);

      return {
        tags: state.tags.filter((tag) => tag.id !== id),
        notes: newNotes,
      };
    });
  },

  addTagToNote: (noteId: string, tag: Tag) => {
    set((state) => {
      // Check if tag already exists in global tags
      const existingTag = state.tags.find((t) => t.id === tag.id);
      const newTags = existingTag ? state.tags : [...state.tags, tag];

      const newNotes = state.notes.map((note) => {
        if (note.id === noteId) {
          const currentTags = note.tags || [];
          // Prevent duplicates
          if (currentTags.some((t) => t.id === tag.id)) {
            return note;
          }
          return {
            ...note,
            tags: [...currentTags, tag],
            updatedAt: new Date().toISOString(),
          };
        }
        return note;
      });

      storageService.saveAllNotes(newNotes);
      recordOnboardingEvent('tag_added', { noteId, tagName: tag.name });

      return {
        tags: newTags,
        notes: newNotes,
      };
    });
  },

  removeTagFromNote: (noteId: string, tagId: string) => {
    set((state) => {
      const newNotes = state.notes.map((note) => {
        if (note.id === noteId && note.tags) {
          return {
            ...note,
            tags: note.tags.filter((tag) => tag.id !== tagId),
            updatedAt: new Date().toISOString(),
          };
        }
        return note;
      });

      storageService.saveAllNotes(newNotes);

      return { notes: newNotes };
    });
  },

  getTagById: (id: string) => {
    return get().tags.find((tag) => tag.id === id);
  },

  getAllTagsWithCounts: () => {
    const { tags, notes } = get();
    return tags.map((tag) => ({
      ...tag,
      noteCount: notes.filter((note) => note.tags?.some((t) => t.id === tag.id))
        .length,
    }));
  },

  // Sandbox management methods
  setSandboxStatus: (status) => {
    set({ sandboxStatus: status });
  },

  checkSandboxHealth: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sandbox/health`, {
        headers: AUTH_HEADERS,
      });
      const data = await response.json();

      const isHealthy = data.health?.isHealthy || false;
      set({
        sandboxStatus: isHealthy ? 'healthy' : 'unhealthy',
        lastHealthCheck: Date.now(),
      });

      return isHealthy;
    } catch (_error) {
      set({ sandboxStatus: 'unknown' });
      return false;
    }
  },

  autoHealSandbox: async (options) => {
    const state = get();

    // Avoid overlapping heal attempts and throttle checks unless forced
    if (state.isCreatingSandbox) {
      return true;
    }
    const now = Date.now();
    const recentlyChecked = state.lastHealthCheck && now - state.lastHealthCheck < 15_000;
    if (recentlyChecked && !options?.force) {
      return state.sandboxStatus === 'healthy';
    }

    // Light-weight health probe
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sandbox/health`);
      const data = await response.json();

      if (data.health?.isHealthy) {
        set({
          sandboxStatus: 'healthy',
          sandboxId: data.health?.sandboxId ?? state.sandboxId,
          lastHealthCheck: now,
          retryCount: 0,
        });
        return true;
      }
    } catch (_error) {
      // Ignore and fall through to recreation
    }

    // Health probe failed - silently recreate without surfacing toasts
    set({
      isCreatingSandbox: true,
      sandboxStatus: 'creating',
    });

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sandbox/recreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADERS,
        },
      });

      if (response.status === 401) {
        set({
          sandboxStatus: 'unhealthy',
          isCreatingSandbox: false,
          lastHealthCheck: Date.now(),
        });
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to recreate sandbox');
      }

      const data = await response.json();

      set({
        sandboxId: data.sandboxId ?? null,
        sandboxStatus: 'healthy',
        isCreatingSandbox: false,
        retryCount: 0,
        lastHealthCheck: Date.now(),
      });
      return true;
    } catch (error) {
      // Safely serialize error for logging to avoid valueOf errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Sandbooks] Auto-heal failed', errorMessage);

      // Check if error is circuit breaker related
      const isCircuitBreakerOpen = errorMessage.toLowerCase().includes('circuit breaker');

      if (isCircuitBreakerOpen) {
        toast.error('Cloud connection temporarily unavailable. Please wait a moment and try again.', {
          duration: 5000,
        });
      }

      set({
        sandboxStatus: 'unhealthy',
        isCreatingSandbox: false,
        lastHealthCheck: Date.now(),
      });
      return false;
    }
  },

  recreateSandbox: async () => {
    set({
      isCreatingSandbox: true,
      sandboxStatus: 'creating',
    });

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sandbox/recreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADERS,
        },
      });

      const data = await response.json();

      if (data.success) {
        set({
          sandboxId: data.sandboxId,
          sandboxStatus: 'healthy',
          isCreatingSandbox: false,
          retryCount: 0,
          lastHealthCheck: Date.now(),
        });
      } else {
        throw new Error('Failed to recreate sandbox');
      }
    } catch (error) {
      set({
        sandboxStatus: 'unhealthy',
        isCreatingSandbox: false,
      });
      throw error;
    }
  },

  // Code block management methods removed - now using ExecutableCodeBlock TipTap nodes

  // Offline queue methods
  setIsOnline: (isOnline: boolean) => {
    set({ isOnline });
    // Process queue when coming back online
    if (isOnline) {
      get().processOfflineQueue();
    }
  },

  queueCodeExecution: (_noteId, _blockId, _code, _language) => {
    // Offline queue functionality removed - code blocks now execute directly as TipTap nodes
    console.warn('Offline queue for code blocks has been removed. Code blocks now execute directly via ExecutableCodeBlock nodes.');
  },

  processOfflineQueue: async () => {
    // Offline queue functionality removed - code blocks now execute directly as TipTap nodes
    console.warn('Offline queue processing removed. Code blocks now execute directly via ExecutableCodeBlock nodes.');
  },

  clearOfflineQueue: () => {
    set({ offlineQueue: [] });
    localStorage.removeItem('sandbooks-offline-queue');
  },

  // Storage Provider Lifecycle Methods
  getStorageInfo: () => storageManager.getMetadata(),

  connectToLocalFolder: async () => {
    try {
      const fsProvider = new FileSystemProvider();
      await fsProvider.connect();

      set({ syncStatus: 'saving' });

      // Load notes from the folder
      const notes = await fsProvider.getNotes();

      // Set as active provider
      storageManager.setProvider(fsProvider);

      set({
        notes,
        activeNoteId: notes[0]?.id || null,
        tags: deriveTagsFromNotes(notes),
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
        storageType: 'fileSystem',
        storageName: fsProvider.metadata.name
      });

      toast.success(`Connected to ${fsProvider.metadata.name}`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled folder picker
        return;
      }
      console.error('Failed to connect to local folder:', error);
      toast.error('Failed to connect to folder');
      set({ syncStatus: 'error' });
    }
  },

  // Disconnect and return to localStorage
  disconnectFromLocalFolder: async () => {
    const currentProvider = storageManager.getProvider();
    if (currentProvider instanceof FileSystemProvider) {
      await currentProvider.disconnect();
      const localProvider = new LocalStorageProvider();
      storageManager.setProvider(localProvider);

      const notes = await localProvider.getNotes();

      // If local storage is empty, ensure we have default docs or at least a clean state
      if (notes.length === 0) {
        // We can trigger the seed logic here to ensure the user isn't left in a void
        // This matches the app initialization logic
        const docs = createDefaultDocumentation();
        await localProvider.saveAllNotes(docs);
        localStorage.setItem('sandbooks-first-run-complete', 'true');

        set({
          notes: docs,
          activeNoteId: docs[0]?.id || null,
          tags: deriveTagsFromNotes(docs),
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
          storageType: 'localStorage',
          storageName: 'Local Storage'
        });
        toast.success('Disconnected from local folder. Loaded default notes.');
      } else {
        set({
          notes,
          activeNoteId: notes[0]?.id || null,
          tags: deriveTagsFromNotes(notes),
          syncStatus: 'synced',
          lastSyncedAt: new Date().toISOString(),
          storageType: 'localStorage',
          storageName: 'Local Storage'
        });
        toast.success('Disconnected from local folder');
      }
    }
  },
}));

// Apply dark mode class on initial load
const darkModeState = useNotesStore.getState().darkModeEnabled;
if (darkModeState) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Restore offline queue from localStorage on initialization
if (typeof window !== 'undefined') {
  try {
    const savedQueue = localStorage.getItem('sandbooks-offline-queue');
    if (savedQueue) {
      const queue = JSON.parse(savedQueue) as import('../types').QueuedCodeExecution[];
      if (Array.isArray(queue) && queue.length > 0) {
        useNotesStore.setState({ offlineQueue: queue });
      }
    }
  } catch (error) {
    console.error('Failed to restore offline queue:', error);
    localStorage.removeItem('sandbooks-offline-queue');
  }
}

// Data migration: Convert codeBlocks array to TipTap ExecutableCodeBlock nodes
export const migrateCodeBlocksToTipTap = (notes: Note[]): Note[] => {
  return notes.map((note) => {
    // If no codeBlocks array or already empty, skip migration
    if (!note.codeBlocks || note.codeBlocks.length === 0) {
      return note;
    }

    // Convert codeBlocks to ExecutableCodeBlock nodes
    const codeBlockNodes = note.codeBlocks.map((block) => ({
      type: 'executableCodeBlock',
      attrs: {
        code: block.code,
        language: block.language,
        // Preserve execution history if available
        executionResult: block.output ? {
          stdout: block.output.stdout || '',
          stderr: block.output.stderr || '',
          exitCode: block.output.exitCode || 0,
          executionTime: block.output.executionTime,
          error: block.output.error,
        } : undefined,
        isExecuting: false,
        executionCount: undefined,
        jupyterOutputs: undefined,
      },
    }));

    // Append code blocks to document content
    const currentContent = note.content.content || [];
    const newContent = {
      ...note.content,
      content: [...currentContent, ...codeBlockNodes],
    };

    // Return note without codeBlocks array
    return {
      ...note,
      content: newContent,
      codeBlocks: undefined, // Remove old codeBlocks array
      updatedAt: new Date().toISOString(),
    };
  });
};

// Helper function to create a new note
export const createNewNote = (): Note => ({
  id: nanoid(),
  title: 'Untitled Note',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [], // Initialize with empty tags array
  // codeBlocks removed - now using ExecutableCodeBlock TipTap nodes
});

// Initialize notes asynchronously from storage
(async () => {
  let notes = await storageManager.getNotes();

  // Run data migration if needed (convert codeBlocks array to TipTap nodes)
  const needsMigration = notes.some(note => note.codeBlocks && note.codeBlocks.length > 0);
  if (needsMigration) {
    console.log('[Migration] Converting codeBlocks to TipTap ExecutableCodeBlock nodes...');
    notes = migrateCodeBlocksToTipTap(notes);
    await storageManager.saveAllNotes(notes);
    console.log('[Migration] Migration complete!');
    toast.success('Code blocks upgraded to new format', { duration: 3000 });
  }

  // Check if this is first launch
  if (notes.length === 0 && localStorage.getItem('sandbooks-first-run-complete') !== 'true') {
    const docNotes = createDefaultDocumentation();
    await storageManager.saveAllNotes(docNotes);
    localStorage.setItem('sandbooks-first-run-complete', 'true');

    useNotesStore.setState({
      notes: docNotes,
      tags: deriveTagsFromNotes(docNotes),
      activeNoteId: docNotes[0]?.id || null
    });
  } else if (notes.length > 0) {
    useNotesStore.setState({
      notes,
      tags: deriveTagsFromNotes(notes),
      activeNoteId: notes[0]?.id || null
    });
  }

})();
