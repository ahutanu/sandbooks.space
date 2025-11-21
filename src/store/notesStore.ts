import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { NotesStore, Note } from '../types';
import type { Tag, TagColor } from '../types/tags.types';
// Terminal types removed - using global session state instead
import { storageService } from '../services/storage';
import { extractTitleFromContent } from '../utils/titleExtraction';
import { getNextTagColor } from '../utils/tagColors';
import { hopxService } from '../services/hopx';
import toast from 'react-hot-toast';
import { createDefaultDocumentation } from '../utils/defaultDocumentation';
import { recordOnboardingEvent, clearOnboardingEvents } from '../utils/onboardingMetrics';

// Initialize dark mode from localStorage or system preference
const initDarkMode = (): boolean => {
  const stored = localStorage.getItem('sandbooks-dark-mode');
  if (stored !== null) {
    return stored === 'true';
  }
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
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

// Global flag to prevent duplicate session initialization (React Strict Mode protection)
let isInitializingTerminalSession = false;

// Initialize notes with documentation on first launch
const initNotesWithDocumentation = (): Note[] => {
  const existingNotes = storageService.getNotes();

  // Check if this is first launch (no notes + no first-run flag)
  const hasRun = localStorage.getItem('sandbooks-first-run-complete');

  if (existingNotes.length === 0 && hasRun !== 'true') {
    const docNotes = createDefaultDocumentation();
    storageService.saveNotes(docNotes);
    localStorage.setItem('sandbooks-first-run-complete', 'true');
    return docNotes;
  }

  return existingNotes;
};

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

const initialNotes = initNotesWithDocumentation();
const initialTags = deriveTagsFromNotes(initialNotes);
const initialActiveNoteId = initialNotes.length > 0 ? initialNotes[0].id : null;

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: initialNotes,
  // Auto-select first note on first launch
  activeNoteId: initialActiveNoteId,
  cloudExecutionEnabled: true,
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

  addNote: (note: Note) => {
    set((state) => {
      const newNotes = [...state.notes, note];
      storageService.saveNotes(newNotes);
      return { notes: newNotes, activeNoteId: note.id };
    });
  },

  updateNote: (id: string, updates: Partial<Note>) => {
    set((state) => {
      const newNotes = state.notes.map((note) => {
        if (note.id === id) {
          // If content is being updated, auto-compute title from first line
          const updatedContent = updates.content || note.content;
          const computedTitle = extractTitleFromContent(updatedContent);

          return {
            ...note,
            ...updates,
            title: computedTitle,
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      });
      storageService.saveNotes(newNotes);
      return { notes: newNotes };
    });
  },

  deleteNote: (id: string) => {
    set((state) => {
      const newNotes = state.notes.filter((note) => note.id !== id);
      storageService.saveNotes(newNotes);
      return {
        notes: newNotes,
        activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      };
    });
  },

  setActiveNote: (id: string | null) => {
    set({ activeNoteId: id });
  },

  toggleCloudExecution: async () => {
    const newState = !get().cloudExecutionEnabled;

    // Update state immediately (optimistic UI)
    set({ cloudExecutionEnabled: newState });
    recordOnboardingEvent('cloud_execution_toggled', { enabled: newState });

    if (newState === true) {
      // ENABLING cloud execution - create sandbox
      toast.loading('Setting up your workspace...', { id: 'sandbox-toggle' });
      set({ isCreatingSandbox: true, sandboxStatus: 'creating' });

      try {
        // Force recreate sandbox (get fresh environment)
        const response = await fetch(`${API_BASE_URL}/api/sandbox/recreate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...AUTH_HEADERS,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to create sandbox');
        }

        const data = await response.json();

        toast.success('Ready to run code', {
          id: 'sandbox-toggle',
          duration: 4000,
        });

        set({
          sandboxStatus: 'healthy',
          sandboxId: data.sandboxId,
          isCreatingSandbox: false,
          retryCount: 0,
          lastHealthCheck: Date.now(),
        });
      } catch (_error) {
        toast.error('Unable to set up workspace. Try again.', {
          id: 'sandbox-toggle',
        });

        // Rollback state
        set({
          cloudExecutionEnabled: false,
          sandboxStatus: 'unhealthy',
          isCreatingSandbox: false,
        });
      }
    } else {
      // DISABLING cloud execution - destroy sandbox
      toast('Cloud execution disabled', {
        duration: 4000,
        icon: 'ℹ️',
      });

      // Optionally destroy sandbox to free resources (background operation)
      try {
        await fetch(`${API_BASE_URL}/api/sandbox/destroy`, {
          method: 'POST',
          headers: AUTH_HEADERS,
        });
      } catch (_error) {
        // Silent failure - not critical
      }

      set({
        sandboxStatus: 'unknown',
        sandboxId: null,
      });
    }
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

  importNotes: (data: string) => {
    const importedNotes = storageService.importNotes(data);
    set((state) => {
      // Merge imported notes with existing ones, avoiding duplicates
      const existingIds = new Set(state.notes.map((n) => n.id));
      const newNotes = importedNotes.filter((n) => !existingIds.has(n.id));
      const allNotes = [...state.notes, ...newNotes];
      storageService.saveNotes(allNotes);
      recordOnboardingEvent('notes_imported', {
        importedCount: importedNotes.length,
        addedCount: newNotes.length,
      });
      return { notes: allNotes };
    });
  },

  resetOnboardingDocs: (options) => {
    const docs = createDefaultDocumentation();
    storageService.saveNotes(docs);
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
    storageService.saveNotes(docs);
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
    if (isInitializingTerminalSession) {
      return;
    }

    try {
      isInitializingTerminalSession = true;

      const response = await fetch(`${API_BASE_URL}/api/terminal/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(import.meta.env.VITE_API_TOKEN ? { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}` } : {})
        },
        body: JSON.stringify({ noteId: 'global' }), // Global session (not tied to note)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({
        globalTerminalSessionId: data.sessionId,
        globalTerminalStatus: 'connecting',
      });
    } catch (error) {
      console.error('[Store] Failed to initialize global terminal session:', error);
      set({
        globalTerminalStatus: 'error',
        globalTerminalSessionId: null
      });
      toast.error('Unable to start terminal. Please try again.');
    } finally {
      isInitializingTerminalSession = false;
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

      storageService.saveNotes(newNotes);

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

      storageService.saveNotes(newNotes);

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

      storageService.saveNotes(newNotes);
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

      storageService.saveNotes(newNotes);

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
      const response = await fetch(`${API_BASE_URL}/api/sandbox/health`, {
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

    if (!state.cloudExecutionEnabled) {
      return false; // Cloud execution disabled - nothing to heal
    }

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
      const response = await fetch(`${API_BASE_URL}/api/sandbox/health`);
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
      const response = await fetch(`${API_BASE_URL}/api/sandbox/recreate`, {
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
      console.error('[Sandbooks] Auto-heal failed', error);
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
      const response = await fetch(`${API_BASE_URL}/api/sandbox/recreate`, {
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

  // Code block management methods
  addCodeBlock: (noteId, codeBlock) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              codeBlocks: [
                ...(note.codeBlocks || []),
                {
                  ...codeBlock,
                  id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ],
              updatedAt: new Date().toISOString(),
            }
          : note
      ),
    }));
    storageService.saveNotes(get().notes);
  },

  updateCodeBlock: (noteId, blockId, updates) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              codeBlocks: note.codeBlocks?.map((block) =>
                block.id === blockId
                  ? { ...block, ...updates, updatedAt: Date.now() }
                  : block
              ),
              updatedAt: new Date().toISOString(),
            }
          : note
      ),
    }));
    storageService.saveNotes(get().notes);
  },

  deleteCodeBlock: (noteId, blockId) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              codeBlocks: note.codeBlocks?.filter((block) => block.id !== blockId),
              updatedAt: new Date().toISOString(),
            }
          : note
      ),
    }));
    storageService.saveNotes(get().notes);
  },

  executeCodeBlock: async (noteId, blockId) => {
    const note = get().notes.find((n) => n.id === noteId);
    const block = note?.codeBlocks?.find((b) => b.id === blockId);

    if (!block) {
      throw new Error('Code block not found');
    }

    try {
      await get().autoHealSandbox({ reason: 'code-block' });
      const result = await hopxService.executeCode(block.code, block.language);

      get().updateCodeBlock(noteId, blockId, {
        output: {
          stdout: result.stdout,
          stderr: result.stderr,
          error: result.error,
          executionTime: result.executionTime,
          exitCode: result.exitCode,
        },
      });
    } catch (error) {
      get().updateCodeBlock(noteId, blockId, {
        output: {
          error: error instanceof Error ? error.message : 'Execution failed',
          exitCode: 1,
        },
      });
      throw error;
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
  codeBlocks: [], // NEW: Initialize with empty code blocks array
});
