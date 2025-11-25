import { z } from 'zod';

// ============================================================================
// Request Schemas (Zod validation)
// ============================================================================

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  state: z.string().min(1, 'State parameter is required'),
  deviceId: z.string().min(16, 'Device ID must be at least 16 characters'),
});

export const GitHubTokenHeadersSchema = z.object({
  'x-github-token': z.string().min(1, 'GitHub token is required'),
  'x-device-id': z.string().min(16, 'Device ID is required'),
});

export const RepoSelectSchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid repo format (expected owner/repo)'),
  path: z.string().default('sandbooks'),
  createIfMissing: z.boolean().default(false),
});

export const SyncPushSchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid repo format'),
  path: z.string().default('sandbooks'),
  notes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.unknown(), // JSONContent - validated loosely but required
    createdAt: z.string(),
    updatedAt: z.string(),
    tags: z.array(z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
    })).optional(),
    isSystemDoc: z.boolean().optional(),
    folderId: z.string().nullable().optional(),
  })),
  folders: z.array(z.object({
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
    sortOrder: z.number(),
    color: z.string().optional(),
    icon: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })).optional(),
  deletedFolderIds: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export const SyncPullSchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'Invalid repo format'),
  path: z.string().default('sandbooks'),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type OAuthCallbackRequest = z.infer<typeof OAuthCallbackSchema>;
export type RepoSelectRequest = z.infer<typeof RepoSelectSchema>;
export type SyncPushRequest = z.infer<typeof SyncPushSchema>;
export type SyncPullRequest = z.infer<typeof SyncPullSchema>;

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

export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
}

export interface OAuthCallbackResponse {
  encryptedToken: string;
  user: GitHubUser;
}

export interface ReposResponse {
  repos: GitHubRepo[];
}

export interface SyncPushResponse {
  success: boolean;
  sha: string;
  syncedAt: string;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
}

export interface SyncPullResponse {
  notes: Array<{
    id: string;
    title: string;
    content: unknown; // JSONContent
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

// Error classification (following HopxService pattern)
export interface GitHubClassifiedError {
  code: string;
  message: string;
  category: 'auth' | 'rate_limit' | 'not_found' | 'permission' | 'network' | 'conflict' | 'unknown';
  recoverable: boolean;
  retryAfter?: number;
}

// OAuth state for CSRF protection
export interface OAuthState {
  deviceId: string;
  timestamp: number;
  nonce: string;
}
