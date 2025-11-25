import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { NotesStore, Note, PayloadErrorInfo, Folder } from '../types';
import type { Tag, TagColor } from '../types/tags.types';
import type { FolderColor } from '../types/folder.types';
import { LocalStorageProvider } from '../services/LocalStorageProvider';
import { FileSystemProvider } from '../services/FileSystemProvider';
import { storageManager, storageService } from '../services/storageManager';
import { extractTitleFromContent } from '../utils/titleExtraction';
import { getNextTagColor } from '../utils/tagColors';
import { showToast as toast } from '../utils/toast';
import { createDefaultDocumentation, DOCS_VERSION, SYSTEM_DOC_TITLES } from '../utils/defaultDocumentation';
import { recordOnboardingEvent, clearOnboardingEvents } from '../utils/onboardingMetrics';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { cloudTerminalProvider } from '../services/terminal/index';
import {
  decodePayload,
  payloadToNote,
  PayloadExpiredError,
  PayloadVersionError,
  PayloadDecodeError,
  getDecodeErrorMessage,
} from '../utils/payload';
import { gitHubService } from '../services/github';
import type { GitHubStatus } from '../types/github.types';
import {
  createFolder as createFolderUtil,
  computeFolderPath,
  buildFolderTree,
  getNotesInFolder as getNotesInFolderUtil,
  validateFolderMove,
  validateFolderDepth,
  normalizeSortOrders,
  loadFoldersFromStorage,
  saveFoldersToStorage,
  loadFolderUIState,
  saveFolderUIState,
} from '../utils/folderUtils';

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

// Initialize folder state from localStorage
const initFolderState = () => {
  const folders = loadFoldersFromStorage();
  const uiState = loadFolderUIState();
  return {
    folders,
    expandedFolderIds: new Set<string>(uiState.expandedFolderIds),
    activeFolderId: uiState.activeFolderId,
    folderViewMode: uiState.folderViewMode,
  };
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

// Cache folder state to avoid multiple localStorage reads
const initialFolderState = initFolderState();

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
  // Folder state
  folders: initialFolderState.folders,
  expandedFolderIds: initialFolderState.expandedFolderIds,
  activeFolderId: initialFolderState.activeFolderId,
  folderViewMode: initialFolderState.folderViewMode,
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
  // Payload link state (for shared notes)
  payloadNote: null,
  payloadMetadata: null,
  payloadError: null,
  isLoadingPayload: false,
  isShareModalOpen: false,
  // Docs version state
  docsUpdateAvailable: false,
  currentDocsVersion: null,
  // GitHub sync state
  gitHubStatus: (gitHubService.isConnected() ? 'connected' : 'disconnected') as GitHubStatus,
  gitHubUser: gitHubService.getStoredUser(),
  gitHubError: null,
  gitHubRepo: gitHubService.getStoredRepo(),
  gitHubPath: gitHubService.getStoredPath(),
  gitHubLastSync: gitHubService.getLastSync(),
  isRepoSelectorOpen: false,
  isSyncConflictModalOpen: false,

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

  // Folder management methods
  createFolder: (name: string, parentId: string | null) => {
    const state = get();

    // Validate depth
    if (!validateFolderDepth(parentId, state.folders)) {
      toast.error('Maximum folder depth reached');
      return state.folders[0]; // Return first folder as fallback
    }

    const newFolder = createFolderUtil(name, parentId, state.folders);
    const newFolders = [...state.folders, newFolder];

    saveFoldersToStorage(newFolders);
    set({ folders: newFolders });

    return newFolder;
  },

  updateFolder: (id: string, updates: Partial<Folder>) => {
    set((state) => {
      const newFolders = state.folders.map((folder) =>
        folder.id === id
          ? { ...folder, ...updates, updatedAt: Date.now() }
          : folder
      );

      saveFoldersToStorage(newFolders);

      return { folders: newFolders };
    });
  },

  deleteFolder: (id: string, options?: { deleteNotes?: boolean }) => {
    set((state) => {
      const folder = state.folders.find((f) => f.id === id);
      if (!folder) return state;

      // Get notes in this folder
      const notesInFolder = state.notes.filter((n) => n.folderId === id);

      let newNotes = state.notes;
      if (options?.deleteNotes) {
        // Delete notes in this folder
        newNotes = state.notes.filter((n) => n.folderId !== id);
        storageService.saveAllNotes(newNotes);
      } else {
        // Move notes to parent folder (or root if no parent)
        newNotes = state.notes.map((n) =>
          n.folderId === id
            ? { ...n, folderId: folder.parentId, updatedAt: new Date().toISOString() }
            : n
        );
        storageService.saveAllNotes(newNotes);
      }

      // Move child folders to parent
      const newFolders = state.folders
        .filter((f) => f.id !== id)
        .map((f) =>
          f.parentId === id
            ? { ...f, parentId: folder.parentId, updatedAt: Date.now() }
            : f
        );

      saveFoldersToStorage(newFolders);

      // Track deleted folder for GitHub sync
      const deletedFolderIds = JSON.parse(localStorage.getItem('sandbooks-deleted-folder-ids') || '[]') as string[];
      if (!deletedFolderIds.includes(id)) {
        deletedFolderIds.push(id);
        localStorage.setItem('sandbooks-deleted-folder-ids', JSON.stringify(deletedFolderIds));
      }

      // Update active folder if it was deleted
      const newActiveFolderId =
        state.activeFolderId === id ? folder.parentId : state.activeFolderId;

      saveFolderUIState({
        expandedFolderIds: Array.from(state.expandedFolderIds),
        activeFolderId: newActiveFolderId,
        folderViewMode: state.folderViewMode,
      });

      toast.success(
        `Folder deleted${notesInFolder.length > 0 ? ` (${notesInFolder.length} note${notesInFolder.length > 1 ? 's' : ''} ${options?.deleteNotes ? 'deleted' : 'moved'})` : ''}`
      );

      return {
        folders: newFolders,
        notes: newNotes,
        activeFolderId: newActiveFolderId,
      };
    });
  },

  moveFolder: (id: string, newParentId: string | null, index?: number) => {
    set((state) => {
      const validation = validateFolderMove(id, newParentId, state.folders);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid folder move');
        return state;
      }

      if (!validateFolderDepth(newParentId, state.folders)) {
        toast.error('Maximum folder depth reached');
        return state;
      }

      const folder = state.folders.find((f) => f.id === id);
      if (!folder) return state;

      // Calculate new sortOrder
      const siblings = state.folders.filter(
        (f) => f.parentId === newParentId && f.id !== id
      );
      let newSortOrder: number;

      if (index !== undefined && index < siblings.length) {
        // Insert at specific position
        const targetSibling = siblings.sort((a, b) => a.sortOrder - b.sortOrder)[index];
        newSortOrder = targetSibling ? targetSibling.sortOrder - 0.5 : 0;
      } else {
        // Append to end
        newSortOrder = siblings.length > 0
          ? Math.max(...siblings.map((f) => f.sortOrder)) + 1
          : 0;
      }

      const newFolders = state.folders.map((f) =>
        f.id === id
          ? { ...f, parentId: newParentId, sortOrder: newSortOrder, updatedAt: Date.now() }
          : f
      );

      // Normalize sort orders
      const normalizedFolders = normalizeSortOrders(newFolders);
      saveFoldersToStorage(normalizedFolders);

      return { folders: normalizedFolders };
    });
  },

  setActiveFolder: (id: string | null) => {
    set((state) => {
      saveFolderUIState({
        expandedFolderIds: Array.from(state.expandedFolderIds),
        activeFolderId: id,
        folderViewMode: state.folderViewMode,
      });
      return { activeFolderId: id };
    });
  },

  toggleFolderExpanded: (id: string) => {
    set((state) => {
      const newExpandedIds = new Set(state.expandedFolderIds);
      if (newExpandedIds.has(id)) {
        newExpandedIds.delete(id);
      } else {
        newExpandedIds.add(id);
      }

      saveFolderUIState({
        expandedFolderIds: Array.from(newExpandedIds),
        activeFolderId: state.activeFolderId,
        folderViewMode: state.folderViewMode,
      });

      return { expandedFolderIds: newExpandedIds };
    });
  },

  moveNoteToFolder: (noteId: string, folderId: string | null) => {
    set((state) => {
      const note = state.notes.find((n) => n.id === noteId);
      if (!note) return state;

      // Calculate folderOrder
      const notesInTargetFolder = state.notes.filter((n) => n.folderId === folderId);
      const maxOrder = notesInTargetFolder.length > 0
        ? Math.max(...notesInTargetFolder.map((n) => n.folderOrder ?? 0))
        : -1;

      const newNotes = state.notes.map((n) =>
        n.id === noteId
          ? {
              ...n,
              folderId,
              folderOrder: maxOrder + 1,
              updatedAt: new Date().toISOString(),
            }
          : n
      );

      storageService.saveAllNotes(newNotes);

      return { notes: newNotes };
    });
  },

  reorderNotesInFolder: (folderId: string | null, noteIds: string[]) => {
    set((state) => {
      const newNotes = state.notes.map((note) => {
        const orderIndex = noteIds.indexOf(note.id);
        if (orderIndex !== -1 && note.folderId === folderId) {
          return {
            ...note,
            folderOrder: orderIndex,
            updatedAt: new Date().toISOString(),
          };
        }
        return note;
      });

      storageService.saveAllNotes(newNotes);

      return { notes: newNotes };
    });
  },

  getFolderById: (id: string) => {
    return get().folders.find((f) => f.id === id);
  },

  getFolderPath: (id: string) => {
    return computeFolderPath(id, get().folders);
  },

  getFolderTree: () => {
    const state = get();
    return buildFolderTree(state.folders, state.notes, state.expandedFolderIds);
  },

  getNotesInFolder: (id: string, options?: { recursive?: boolean }) => {
    const state = get();
    return getNotesInFolderUtil(id, state.notes, state.folders, options);
  },

  getAllFoldersWithVirtual: () => {
    // Simplified: no more virtual folders, just return real folders
    return get().folders;
  },

  setFolderViewMode: (mode: 'tree' | 'flat') => {
    set((state) => {
      saveFolderUIState({
        expandedFolderIds: Array.from(state.expandedFolderIds),
        activeFolderId: state.activeFolderId,
        folderViewMode: mode,
      });
      return { folderViewMode: mode };
    });
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
    // Throttle to 60 seconds (matches backend cache duration)
    const recentlyChecked = state.lastHealthCheck && now - state.lastHealthCheck < 60_000;
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

  // Payload link methods
  loadPayload: async (token: string) => {
    set({
      isLoadingPayload: true,
      payloadError: null,
      payloadNote: null,
      payloadMetadata: null,
    });

    try {
      const { payloadNote: decodedPayload, metadata } = decodePayload(token);
      const note = payloadToNote(decodedPayload);

      set({
        payloadNote: note,
        payloadMetadata: metadata,
        isLoadingPayload: false,
        payloadError: null,
      });

      recordOnboardingEvent('payload_link_opened', { tokenLength: token.length });
    } catch (error) {
      let errorInfo: PayloadErrorInfo;

      if (error instanceof PayloadExpiredError) {
        errorInfo = {
          message: 'This shared note has expired and is no longer available.',
          type: 'expired',
        };
      } else if (error instanceof PayloadVersionError) {
        errorInfo = {
          message:
            error.code === 'VERSION_TOO_NEW'
              ? 'This note was created with a newer version of Sandbooks. Please refresh the page to update.'
              : 'This link format is no longer supported.',
          type: 'version',
        };
      } else if (error instanceof PayloadDecodeError) {
        errorInfo = {
          message: getDecodeErrorMessage(error),
          type: 'corrupted',
        };
      } else {
        errorInfo = {
          message: 'Could not open this shared note. The link may be corrupted.',
          type: 'unknown',
        };
      }

      set({
        payloadError: errorInfo,
        isLoadingPayload: false,
        payloadNote: null,
        payloadMetadata: null,
      });
    }
  },

  clearPayload: () => {
    set({
      payloadNote: null,
      payloadMetadata: null,
      payloadError: null,
      isLoadingPayload: false,
    });
  },

  savePayloadToNotes: () => {
    const state = get();
    if (!state.payloadNote) {
      return null;
    }

    // Create a new note with a fresh ID
    const newNote: Note = {
      ...state.payloadNote,
      id: nanoid(),
      updatedAt: new Date().toISOString(),
    };

    // Add to notes
    get().addNote(newNote);

    // Clear payload state
    set({
      payloadNote: null,
      payloadMetadata: null,
      payloadError: null,
    });

    toast.success('Note saved to your collection');
    recordOnboardingEvent('payload_note_saved');

    return newNote;
  },

  setShareModalOpen: (open: boolean) => {
    set({ isShareModalOpen: open });
  },

  // Docs version management methods
  checkDocsVersion: () => {
    const storedVersion = localStorage.getItem('sandbooks-docs-version');
    const currentVersion = storedVersion ? parseInt(storedVersion, 10) : null;
    const dismissedVersion = localStorage.getItem('sandbooks-docs-update-dismissed');

    set({ currentDocsVersion: currentVersion });

    // Check if update is available (and not dismissed)
    if (currentVersion !== null && currentVersion < DOCS_VERSION) {
      // Only show notification if user hasn't dismissed this version
      if (dismissedVersion !== String(DOCS_VERSION)) {
        set({ docsUpdateAvailable: true });
      }
    }
  },

  updateSystemDocs: () => {
    const state = get();
    const { notes } = state;

    // Identify system docs (by isSystemDoc flag or well-known titles)
    const isSystemDoc = (note: Note): boolean => {
      if (note.isSystemDoc) return true;
      // Fallback: check against well-known titles for backward compatibility
      return SYSTEM_DOC_TITLES.includes(note.title as typeof SYSTEM_DOC_TITLES[number]);
    };

    // Separate user notes from system docs
    const userNotes = notes.filter((note) => !isSystemDoc(note));

    // Create fresh system docs
    const newSystemDocs = createDefaultDocumentation();

    // Merge: new system docs first, then user notes
    const mergedNotes = [...newSystemDocs, ...userNotes];

    // Save to storage
    storageService.saveAllNotes(mergedNotes);

    // Update localStorage version
    localStorage.setItem('sandbooks-docs-version', String(DOCS_VERSION));

    // Update state
    set({
      notes: mergedNotes,
      tags: deriveTagsFromNotes(mergedNotes),
      activeNoteId: mergedNotes[0]?.id ?? null,
      docsUpdateAvailable: false,
      currentDocsVersion: DOCS_VERSION,
    });

    recordOnboardingEvent('docs_updated', {
      fromVersion: state.currentDocsVersion,
      toVersion: DOCS_VERSION,
      userNotesPreserved: userNotes.length,
    });

    toast.success(`Documentation updated. ${userNotes.length} personal note${userNotes.length !== 1 ? 's' : ''} preserved.`);
  },

  dismissDocsUpdate: () => {
    // User chose to keep old docs - store dismissed version to avoid re-prompting
    localStorage.setItem('sandbooks-docs-update-dismissed', String(DOCS_VERSION));
    set({ docsUpdateAvailable: false });
  },

  // ============================================================================
  // GitHub Sync Methods
  // ============================================================================

  connectGitHub: async () => {
    set({ gitHubStatus: 'connecting', gitHubError: null });
    try {
      const { user } = await gitHubService.startOAuthFlow();
      set({
        gitHubStatus: 'connected',
        gitHubUser: user,
        gitHubError: null,
      });
      toast.success(`Connected to GitHub as ${user.login}`);
      recordOnboardingEvent('github_connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect to GitHub';
      set({ gitHubStatus: 'error', gitHubError: message });
      toast.error(message);
    }
  },

  disconnectGitHub: async () => {
    try {
      await gitHubService.disconnect();
    } catch {
      // Ignore errors - we'll clear state anyway
    }
    set({
      gitHubStatus: 'disconnected',
      gitHubUser: null,
      gitHubRepo: null,
      gitHubLastSync: null,
      gitHubError: null,
    });
    toast.success('Disconnected from GitHub');
  },

  setRepoSelectorOpen: (open: boolean) => {
    set({ isRepoSelectorOpen: open });
  },

  selectGitHubRepo: async (repo: string, createIfMissing = false) => {
    const state = get();
    if (state.gitHubStatus !== 'connected') {
      toast.error('Not connected to GitHub');
      return;
    }

    try {
      await gitHubService.selectRepo(repo, state.gitHubPath, createIfMissing);
      set({
        gitHubRepo: repo,
        isRepoSelectorOpen: false,
      });
      toast.success(`Connected to ${repo}`);

      // Check if there are notes in the repo
      const remoteResult = await gitHubService.pull();
      const localNotes = state.notes;

      // If both local and remote have notes, show conflict modal
      if (remoteResult.notes.length > 0 && localNotes.length > 0) {
        set({ isSyncConflictModalOpen: true });
      } else if (remoteResult.notes.length > 0) {
        // Only remote has notes - import them
        await get().resolveInitialSyncConflict('github');
      } else if (localNotes.length > 0) {
        // Only local has notes - push them
        await get().resolveInitialSyncConflict('local');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select repository';
      toast.error(message);
    }
  },

  pushToGitHub: async (message?: string) => {
    const state = get();
    if (state.gitHubStatus !== 'connected' || !state.gitHubRepo) {
      toast.error('Not connected to GitHub or no repository selected');
      return;
    }

    set({ gitHubStatus: 'syncing' });
    try {
      // Prepare folders for sync
      const foldersForSync = state.folders.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        sortOrder: f.sortOrder,
        color: f.color,
        icon: f.icon,
        createdAt: new Date(f.createdAt).toISOString(),
        updatedAt: new Date(f.updatedAt).toISOString(),
      }));

      // Get deleted folder IDs from storage
      const deletedFolderIds = JSON.parse(localStorage.getItem('sandbooks-deleted-folder-ids') || '[]') as string[];

      const result = await gitHubService.push(state.notes, message, foldersForSync, deletedFolderIds);

      // Clear deleted folder IDs after successful push
      localStorage.removeItem('sandbooks-deleted-folder-ids');
      set({
        gitHubStatus: 'connected',
        gitHubLastSync: result.syncedAt,
      });
      toast.success(`Pushed ${(result.filesCreated ?? 0) + (result.filesUpdated ?? 0)} notes to GitHub`);
      recordOnboardingEvent('github_pushed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to push to GitHub';
      set({ gitHubStatus: 'error', gitHubError: errorMessage });
      toast.error(errorMessage);
    }
  },

  pullFromGitHub: async () => {
    const state = get();
    if (state.gitHubStatus !== 'connected' || !state.gitHubRepo) {
      toast.error('Not connected to GitHub or no repository selected');
      return;
    }

    set({ gitHubStatus: 'syncing' });
    try {
      const result = await gitHubService.pull();

      // Merge pulled notes with existing notes
      const existingIds = new Set(state.notes.map(n => n.id));
      const newNotes: Note[] = [];
      const updatedNotes: Note[] = [];

      for (const remoteNote of result.notes) {
        if (existingIds.has(remoteNote.id)) {
          // Update existing note
          updatedNotes.push(remoteNote as Note);
        } else {
          // Add new note
          newNotes.push(remoteNote as Note);
        }
      }

      // Apply updates
      const mergedNotes = state.notes.map(note => {
        const updated = updatedNotes.find(u => u.id === note.id);
        return updated || note;
      });

      // Add new notes
      const allNotes = [...mergedNotes, ...newNotes];

      // Merge folders if present in pull result
      let mergedFolders = state.folders;
      if (result.folders && result.folders.length > 0) {
        const existingFolderIds = new Set(state.folders.map(f => f.id));
        const newFolders: Folder[] = [];

        for (const remoteFolder of result.folders) {
          if (!existingFolderIds.has(remoteFolder.id)) {
            // Add new folder - preserve all metadata from GitHub
            newFolders.push({
              id: remoteFolder.id,
              name: remoteFolder.name,
              parentId: remoteFolder.parentId,
              sortOrder: remoteFolder.sortOrder,
              color: remoteFolder.color as FolderColor | undefined,
              icon: remoteFolder.icon,
              createdAt: remoteFolder.createdAt
                ? new Date(remoteFolder.createdAt).getTime()
                : Date.now(),
              updatedAt: remoteFolder.updatedAt
                ? new Date(remoteFolder.updatedAt).getTime()
                : Date.now(),
            });
          }
        }

        mergedFolders = [...state.folders, ...newFolders];

        // Remove deleted folders from local state
        if (result.deletedFolderIds && result.deletedFolderIds.length > 0) {
          const deletedIds = new Set(result.deletedFolderIds);
          mergedFolders = mergedFolders.filter(f => !deletedIds.has(f.id));
        }

        // Save folders to local storage
        saveFoldersToStorage(mergedFolders);
      } else if (result.deletedFolderIds && result.deletedFolderIds.length > 0) {
        // Handle deleted folders even when no new folders
        const deletedIds = new Set(result.deletedFolderIds);
        mergedFolders = state.folders.filter(f => !deletedIds.has(f.id));
        saveFoldersToStorage(mergedFolders);
      }

      set({
        notes: allNotes,
        tags: deriveTagsFromNotes(allNotes),
        folders: mergedFolders,
        gitHubStatus: 'connected',
        gitHubLastSync: result.syncedAt,
      });

      // Save to local storage
      await storageManager.saveAllNotes(allNotes);

      const folderCount = result.folders?.length || 0;
      const noteCount = result.notes.length;
      toast.success(
        folderCount > 0
          ? `Pulled ${noteCount} notes and ${folderCount} folders from GitHub`
          : `Pulled ${noteCount} notes from GitHub`
      );
      recordOnboardingEvent('github_pulled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pull from GitHub';
      set({ gitHubStatus: 'error', gitHubError: errorMessage });
      toast.error(errorMessage);
    }
  },

  setSyncConflictModalOpen: (open: boolean) => {
    set({ isSyncConflictModalOpen: open });
  },

  resolveInitialSyncConflict: async (strategy) => {
    const state = get();
    set({ isSyncConflictModalOpen: false, gitHubStatus: 'syncing' });

    // Helper to convert remote folders to local Folder type
    const convertRemoteFolders = (remoteFolders?: Array<{
      id: string;
      name: string;
      parentId: string | null;
      path: string;
      sortOrder: number;
      color?: string;
      icon?: string;
      createdAt?: string;
      updatedAt?: string;
    }>): Folder[] => {
      if (!remoteFolders) return [];
      return remoteFolders.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        sortOrder: f.sortOrder,
        color: f.color as FolderColor | undefined,
        icon: f.icon,
        createdAt: f.createdAt
          ? new Date(f.createdAt).getTime()
          : Date.now(),
        updatedAt: f.updatedAt
          ? new Date(f.updatedAt).getTime()
          : Date.now(),
      }));
    };

    // Prepare folders for push
    const foldersForSync = state.folders.map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      sortOrder: f.sortOrder,
      color: f.color,
      icon: f.icon,
      createdAt: new Date(f.createdAt).toISOString(),
      updatedAt: new Date(f.updatedAt).toISOString(),
    }));

    try {
      if (strategy === 'github') {
        // Replace local with GitHub
        const result = await gitHubService.pull();
        const remoteNotes = result.notes as Note[];
        const remoteFolders = convertRemoteFolders(result.folders);

        set({
          notes: remoteNotes,
          tags: deriveTagsFromNotes(remoteNotes),
          folders: remoteFolders,
          gitHubStatus: 'connected',
          gitHubLastSync: result.syncedAt,
        });
        await storageManager.saveAllNotes(remoteNotes);
        saveFoldersToStorage(remoteFolders);
        toast.success('Notes and folders replaced with GitHub version');
      } else if (strategy === 'local') {
        // Push local to GitHub
        const result = await gitHubService.push(state.notes, undefined, foldersForSync);
        set({
          gitHubStatus: 'connected',
          gitHubLastSync: result.syncedAt,
        });
        toast.success('Pushed local notes and folders to GitHub');
      } else if (strategy === 'merge') {
        // Merge both - pull first, then push
        const pullResult = await gitHubService.pull();
        const remoteNotes = pullResult.notes as Note[];
        const remoteFolders = convertRemoteFolders(pullResult.folders);

        // Merge notes: keep all local notes, add remote notes that don't exist locally
        const localIds = new Set(state.notes.map(n => n.id));
        const newRemoteNotes = remoteNotes.filter(n => !localIds.has(n.id));
        const mergedNotes = [...state.notes, ...newRemoteNotes];

        // Merge folders: keep all local folders, add remote folders that don't exist locally
        const localFolderIds = new Set(state.folders.map(f => f.id));
        const newRemoteFolders = remoteFolders.filter(f => !localFolderIds.has(f.id));
        const mergedFolders = [...state.folders, ...newRemoteFolders];

        // Prepare merged folders for push
        const mergedFoldersForSync = mergedFolders.map(f => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          sortOrder: f.sortOrder,
          color: f.color,
          icon: f.icon,
          createdAt: new Date(f.createdAt).toISOString(),
          updatedAt: new Date(f.updatedAt).toISOString(),
        }));

        // Push merged notes and folders
        const pushResult = await gitHubService.push(mergedNotes, undefined, mergedFoldersForSync);

        set({
          notes: mergedNotes,
          tags: deriveTagsFromNotes(mergedNotes),
          folders: mergedFolders,
          gitHubStatus: 'connected',
          gitHubLastSync: pushResult.syncedAt,
        });
        await storageManager.saveAllNotes(mergedNotes);
        saveFoldersToStorage(mergedFolders);
        toast.success(`Merged: ${newRemoteNotes.length} notes + ${newRemoteFolders.length} folders from GitHub`);
      }

      recordOnboardingEvent('github_sync_resolved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve sync conflict';
      set({ gitHubStatus: 'error', gitHubError: errorMessage });
      toast.error(errorMessage);
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
    // Set initial docs version for new users
    localStorage.setItem('sandbooks-docs-version', String(DOCS_VERSION));

    useNotesStore.setState({
      notes: docNotes,
      tags: deriveTagsFromNotes(docNotes),
      activeNoteId: docNotes[0]?.id || null,
      currentDocsVersion: DOCS_VERSION,
    });
  } else if (notes.length > 0) {
    useNotesStore.setState({
      notes,
      tags: deriveTagsFromNotes(notes),
      activeNoteId: notes[0]?.id || null
    });

    // Check for docs version updates (for returning users)
    useNotesStore.getState().checkDocsVersion();
  }

})();
