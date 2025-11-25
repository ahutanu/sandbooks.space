import type { JSONContent } from '@tiptap/react';
import type { Tag } from './tags.types';
// Terminal types removed - using global session state instead

export interface CodeBlock {
  id: string;
  code: string;
  language: Language;
  output?: {
    stdout?: string;
    stderr?: string;
    error?: string;
    executionTime?: number;
    exitCode?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[]; // Optional for backwards compatibility
  codeBlocks?: CodeBlock[]; // NEW: Separate code blocks (optional for migration)
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: number;
  richOutputs?: Array<{
    type: string;
    data: string; // base64 encoded for images
  }>;
  error?: string;
  sandboxStatus?: SandboxStatus; // Status after execution
  recoverable?: boolean; // Can retry/restart
}

export type SandboxStatus =
  | 'healthy'    // Green - sandbox operational
  | 'recovering' // Yellow - retry in progress
  | 'unhealthy'  // Red - manual restart needed
  | 'unknown'    // Gray - checking health
  | 'creating';  // Blue - creating sandbox

export type SyncStatus = 'synced' | 'saving' | 'error' | 'disconnected';

export interface CodeBlockAttrs {
  language: string;
  executionResult?: ExecutionResult;
  isExecuting?: boolean;
}

export type Language = 'python' | 'javascript' | 'typescript' | 'bash' | 'go';

// Execution mode types
export type ExecutionMode = 'cloud' | 'local';
export type ExecutionProvider = 'cloud' | 'local';
export type TerminalProvider = 'cloud';

export interface QueuedCodeExecution {
  id: string;
  noteId: string;
  blockId: string;
  code: string;
  language: Language;
  timestamp: number;
}

export interface NotesStore {
  notes: Note[];
  activeNoteId: string | null;
  darkModeEnabled: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  isShortcutsOpen: boolean;
  isSidebarOpen: boolean; // Sidebar visibility toggle
  typewriterModeEnabled: boolean; // Typewriter mode toggle
  focusModeEnabled: boolean; // Focus mode (dims non-active paragraphs)
  tags: Tag[]; // All unique tags
  // Terminal state (GLOBAL - single session for entire app, cloud-only)
  isTerminalOpen: boolean;
  terminalHeight: number;
  globalTerminalSessionId: string | null;
  globalTerminalStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  // Sandbox state (ephemeral, not persisted)
  sandboxStatus: SandboxStatus;
  sandboxId: string | null;
  lastHealthCheck: number | null;
  retryCount: number;
  isCreatingSandbox: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  storageType: 'localStorage' | 'fileSystem'; // NEW: Track active provider type
  storageName: string; // NEW: Track active provider name
  // Offline queue state
  isOnline: boolean;
  offlineQueue: QueuedCodeExecution[];
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  toggleDarkMode: () => void;
  exportNotes: () => string;
  importNotes: (json: string) => boolean;
  importMarkdownNote: (file: File) => Promise<void>;
  resetOnboardingDocs: (options?: { silent?: boolean; source?: string }) => void;
  toggleShortcuts: () => void;
  toggleSidebar: () => void;
  toggleTypewriterMode: () => void;
  toggleFocusMode: () => void;
  // Terminal management methods (GLOBAL SESSION)
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;
  initializeGlobalTerminalSession: () => Promise<void>;
  setGlobalTerminalStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  // Tag management methods
  addTag: (name: string, color?: import('./tags.types').TagColor) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addTagToNote: (noteId: string, tag: Tag) => void;
  removeTagFromNote: (noteId: string, tagId: string) => void;
  getTagById: (id: string) => Tag | undefined;
  getAllTagsWithCounts: () => import('./tags.types').TagWithCount[];
  // Sandbox management methods
  setSandboxStatus: (status: SandboxStatus) => void;
  checkSandboxHealth: () => Promise<boolean>;
  autoHealSandbox: (options?: { reason?: string; force?: boolean }) => Promise<boolean>;
  recreateSandbox: () => Promise<void>;
  // Onboarding
  seedDocsIfMissing: () => void;
  // Code block management methods (NEW)
  addCodeBlock: (noteId: string, codeBlock: Omit<CodeBlock, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCodeBlock: (noteId: string, blockId: string, updates: Partial<CodeBlock>) => void;
  deleteCodeBlock: (noteId: string, blockId: string) => void;
  executeCodeBlock: (noteId: string, blockId: string) => Promise<void>;
  // Offline queue methods
  setIsOnline: (isOnline: boolean) => void;
  queueCodeExecution: (noteId: string, blockId: string, code: string, language: Language) => void;
  processOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;
  // Storage Provider - replaces fileSystemHandle
  getStorageInfo: () => import('../services/StorageProvider').StorageProviderMetadata;
  connectToLocalFolder: () => Promise<void>;
  disconnectFromLocalFolder: () => Promise<void>;
}
