/**
 * GitHub API Service
 * Handles all communication with the backend GitHub endpoints
 */

import type { Note } from '../types';
import type { GitHubUser, GitHubRepo, GitHubSyncResult, GitHubPullResult } from '../types/github.types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { getDeviceId } from '../utils/deviceId';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

// ============================================================================
// Storage Keys
// ============================================================================

const GITHUB_STORAGE_KEYS = {
  TOKEN: 'sandbooks-github-token',
  USER: 'sandbooks-github-user',
  REPO: 'sandbooks-github-repo',
  PATH: 'sandbooks-github-path',
  LAST_SYNC: 'sandbooks-github-last-sync',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  return headers;
}

function getGitHubHeaders(): Record<string, string> {
  const headers = getAuthHeaders();
  const token = localStorage.getItem(GITHUB_STORAGE_KEYS.TOKEN);
  const deviceId = getDeviceId();

  if (token) {
    headers['X-GitHub-Token'] = token;
  }
  headers['X-Device-ID'] = deviceId;

  return headers;
}

// ============================================================================
// GitHub Service Class
// ============================================================================

class GitHubService {
  private deviceId: string;

  constructor() {
    this.deviceId = getDeviceId();
  }

  // ============================================================================
  // OAuth Flow
  // ============================================================================

  /**
   * Get the GitHub OAuth URL and open in a popup
   */
  async startOAuthFlow(): Promise<{ user: GitHubUser }> {
    // Get OAuth URL from backend
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/github/oauth/url?deviceId=${this.deviceId}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get OAuth URL' }));
      throw new Error(error.error || 'Failed to start GitHub connection');
    }

    const { url } = await response.json();

    // Open popup for OAuth
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      // Poll for callback
      const pollInterval = setInterval(() => {
        try {
          // Check if popup is closed
          if (popup.closed) {
            clearInterval(pollInterval);
            reject(new Error('OAuth cancelled'));
            return;
          }

          // Check for callback URL
          const currentUrl = popup.location.href;
          if (currentUrl.includes('/github/callback')) {
            clearInterval(pollInterval);

            // Extract code and state from URL
            const urlParams = new URLSearchParams(popup.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            popup.close();

            if (code && state) {
              // Exchange code for token
              this.exchangeCodeForToken(code, state)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error('OAuth callback missing code or state'));
            }
          }
        } catch {
          // Cross-origin error - popup is still on GitHub domain, keep polling
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error('OAuth timeout'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Exchange OAuth code for token
   */
  private async exchangeCodeForToken(code: string, state: string): Promise<{ user: GitHubUser }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/github/oauth/callback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        code,
        state,
        deviceId: this.deviceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'OAuth failed' }));
      throw new Error(error.error || 'Failed to authenticate with GitHub');
    }

    const data = await response.json();

    // Store encrypted token and user info
    localStorage.setItem(GITHUB_STORAGE_KEYS.TOKEN, data.encryptedToken);
    localStorage.setItem(GITHUB_STORAGE_KEYS.USER, JSON.stringify(data.user));

    return { user: data.user };
  }

  /**
   * Disconnect from GitHub
   */
  async disconnect(): Promise<void> {
    try {
      await fetchWithTimeout(`${API_BASE_URL}/api/github/oauth/revoke`, {
        method: 'DELETE',
        headers: getGitHubHeaders(),
      });
    } catch {
      // Ignore errors - we'll clear local state anyway
    }

    // Clear all GitHub data from localStorage
    Object.values(GITHUB_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // ============================================================================
  // Repository Management
  // ============================================================================

  /**
   * List user's repositories
   */
  async listRepos(): Promise<GitHubRepo[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/github/repos`, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to list repos' }));
      throw new Error(error.error || 'Failed to list repositories');
    }

    const data = await response.json();
    return data.repos;
  }

  /**
   * Select a repository for sync
   */
  async selectRepo(repo: string, path: string = 'sandbooks', createIfMissing: boolean = false): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/github/repos/select`, {
      method: 'POST',
      headers: getGitHubHeaders(),
      body: JSON.stringify({ repo, path, createIfMissing }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to select repo' }));
      throw new Error(error.error || 'Failed to select repository');
    }

    // Store repo selection
    localStorage.setItem(GITHUB_STORAGE_KEYS.REPO, repo);
    localStorage.setItem(GITHUB_STORAGE_KEYS.PATH, path);
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Push notes to GitHub
   */
  async push(notes: Note[], message?: string): Promise<GitHubSyncResult> {
    const repo = localStorage.getItem(GITHUB_STORAGE_KEYS.REPO);
    const path = localStorage.getItem(GITHUB_STORAGE_KEYS.PATH) || 'sandbooks';

    if (!repo) {
      throw new Error('No repository selected');
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/github/sync/push`, {
      method: 'POST',
      headers: getGitHubHeaders(),
      body: JSON.stringify({ repo, path, notes, message }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Push failed' }));
      throw new Error(error.error || 'Failed to push to GitHub');
    }

    const result = await response.json();

    // Update last sync time
    localStorage.setItem(GITHUB_STORAGE_KEYS.LAST_SYNC, result.syncedAt);

    return result;
  }

  /**
   * Pull notes from GitHub
   */
  async pull(): Promise<GitHubPullResult> {
    const repo = localStorage.getItem(GITHUB_STORAGE_KEYS.REPO);
    const path = localStorage.getItem(GITHUB_STORAGE_KEYS.PATH) || 'sandbooks';

    if (!repo) {
      throw new Error('No repository selected');
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/github/sync/pull`, {
      method: 'POST',
      headers: getGitHubHeaders(),
      body: JSON.stringify({ repo, path }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Pull failed' }));
      throw new Error(error.error || 'Failed to pull from GitHub');
    }

    const result = await response.json();

    // Update last sync time
    localStorage.setItem(GITHUB_STORAGE_KEYS.LAST_SYNC, result.syncedAt);

    return result;
  }

  // ============================================================================
  // State Helpers
  // ============================================================================

  /**
   * Check if connected to GitHub
   */
  isConnected(): boolean {
    return !!localStorage.getItem(GITHUB_STORAGE_KEYS.TOKEN);
  }

  /**
   * Get stored user info
   */
  getStoredUser(): GitHubUser | null {
    const userJson = localStorage.getItem(GITHUB_STORAGE_KEYS.USER);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get stored repo
   */
  getStoredRepo(): string | null {
    return localStorage.getItem(GITHUB_STORAGE_KEYS.REPO);
  }

  /**
   * Get stored sync path
   */
  getStoredPath(): string {
    return localStorage.getItem(GITHUB_STORAGE_KEYS.PATH) || 'sandbooks';
  }

  /**
   * Get last sync time
   */
  getLastSync(): string | null {
    return localStorage.getItem(GITHUB_STORAGE_KEYS.LAST_SYNC);
  }
}

// Export singleton instance
export const gitHubService = new GitHubService();
