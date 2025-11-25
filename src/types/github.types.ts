// ============================================================================
// GitHub Integration Types
// ============================================================================

export type GitHubStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'error';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  owner: {
    login: string;
  };
}

export interface GitHubSyncResult {
  success: boolean;
  sha: string;
  syncedAt: string;
  filesCreated?: number;
  filesUpdated?: number;
  filesDeleted?: number;
}

export interface GitHubPullResult {
  notes: Array<{
    id: string;
    title: string;
    content: unknown;
    createdAt: string;
    updatedAt: string;
    tags?: Array<{ id: string; name: string; color: string }>;
    isSystemDoc?: boolean;
    folderId?: string | null;
    folderPath?: string | null;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    parentId: string | null;
    path: string;
    sortOrder: number;
    color?: string;
    icon?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  deletedFolderIds?: string[];
  sha: string;
  syncedAt: string;
}

export type SyncConflictStrategy = 'merge' | 'github' | 'local';

export interface GitHubState {
  // Connection state
  gitHubStatus: GitHubStatus;
  gitHubUser: GitHubUser | null;
  gitHubError: string | null;

  // Repository configuration
  gitHubRepo: string | null;
  gitHubPath: string;
  gitHubLastSync: string | null;

  // UI state
  isRepoSelectorOpen: boolean;
  isSyncConflictModalOpen: boolean;
}

export interface GitHubActions {
  // Connection
  connectGitHub: () => Promise<void>;
  disconnectGitHub: () => Promise<void>;

  // Repository management
  setRepoSelectorOpen: (open: boolean) => void;
  selectGitHubRepo: (repo: string, createIfMissing?: boolean) => Promise<void>;

  // Sync operations
  pushToGitHub: (message?: string) => Promise<void>;
  pullFromGitHub: () => Promise<void>;

  // Conflict resolution
  setSyncConflictModalOpen: (open: boolean) => void;
  resolveInitialSyncConflict: (strategy: SyncConflictStrategy) => Promise<void>;
}
