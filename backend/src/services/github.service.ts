import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';
import {
  encryptToken,
  decryptToken,
  generateOAuthState,
  verifyOAuthState,
  redactToken,
} from '../utils/githubCrypto';
import type {
  GitHubUser,
  GitHubRepo,
  OAuthTokenResponse,
  GitHubClassifiedError,
  SyncPushResponse,
  SyncPullResponse,
} from '../types/github.types';

// ============================================================================
// Configuration
// ============================================================================

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

/**
 * Convert title to filesystem-safe slug
 * Example: "My Note Title!" -> "my-note-title"
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and dashes
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Collapse multiple dashes
    .replace(/^-|-$/g, '')    // Trim leading/trailing dashes
    || 'untitled';            // Fallback for empty titles
}

// Rate limit handling
const RATE_LIMIT_CONFIG = {
  MIN_REMAINING: 10,       // Warn when below this threshold
  BACKOFF_MS: 60000,       // Default backoff when rate limited
};

// ============================================================================
// GitHub Service (Singleton)
// ============================================================================

class GitHubService {
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;

  // Rate limit tracking
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: number = 0;

  constructor() {
    // These will be set when env vars are loaded
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL || '';

    if (this.clientId && this.clientSecret) {
      logger.info('GitHub Service initialized', {
        clientId: redactToken(this.clientId),
        callbackUrl: this.callbackUrl,
      });
    } else {
      logger.warn('GitHub Service initialized without credentials (GITHUB_CLIENT_ID/SECRET not set)');
    }
  }

  /**
   * Reinitialize with updated environment variables
   * Called after env.ts loads to ensure values are set
   */
  initialize(clientId: string, clientSecret: string, callbackUrl: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.callbackUrl = callbackUrl;
    logger.info('GitHub Service credentials updated', {
      clientId: redactToken(clientId),
      callbackUrl,
    });
  }

  /**
   * Check if GitHub integration is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  // ============================================================================
  // OAuth Flow
  // ============================================================================

  /**
   * Generate the GitHub OAuth authorization URL
   */
  getAuthUrl(deviceId: string): string {
    const state = generateOAuthState(deviceId, this.clientSecret);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'repo read:user',
      state,
    });

    return `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
  }

  /**
   * Verify OAuth state parameter and return deviceId if valid
   */
  verifyState(state: string): { deviceId: string } | null {
    return verifyOAuthState(state, this.clientSecret);
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    logger.debug('Exchanging OAuth code for token');

    const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }),
    });

    const data = await response.json() as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      logger.error('OAuth token exchange failed', { error: data.error });
      throw new Error(data.error_description || data.error);
    }

    logger.debug('OAuth token exchange successful', {
      tokenType: data.token_type,
      scope: data.scope,
    });

    return {
      accessToken: data.access_token!,
      tokenType: data.token_type!,
      scope: data.scope!,
    };
  }

  /**
   * Encrypt access token for frontend storage
   */
  encryptTokenForDevice(token: string, deviceId: string): string {
    return encryptToken(token, deviceId, this.clientSecret);
  }

  /**
   * Decrypt access token from frontend
   */
  decryptTokenFromDevice(encryptedToken: string, deviceId: string): string {
    return decryptToken(encryptedToken, deviceId, this.clientSecret);
  }

  // ============================================================================
  // GitHub API Helpers
  // ============================================================================

  /**
   * Make authenticated request to GitHub API
   */
  private async githubFetch<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Track rate limits
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    if (remaining) this.rateLimitRemaining = parseInt(remaining, 10);
    if (reset) this.rateLimitReset = parseInt(reset, 10) * 1000;

    if (this.rateLimitRemaining < RATE_LIMIT_CONFIG.MIN_REMAINING) {
      logger.warn('GitHub API rate limit low', {
        remaining: this.rateLimitRemaining,
        resetAt: new Date(this.rateLimitReset).toISOString(),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { message?: string; errors?: Array<{ resource?: string; code?: string; field?: string; message?: string }> };
      const classified = this.classifyError(response.status, errorData.message);

      // Log with raw GitHub error for debugging
      const gitHubError = errorData.message || 'No message';
      const gitHubErrors = errorData.errors ? JSON.stringify(errorData.errors) : 'none';
      logger.error(
        `GitHub API error: ${endpoint} returned ${response.status} - ${gitHubError} (errors: ${gitHubErrors})`
      );

      const error = new Error(classified.message) as Error & { classified: GitHubClassifiedError };
      error.classified = classified;
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Classify GitHub API errors
   */
  private classifyError(status: number, message?: string): GitHubClassifiedError {
    const normalizedMsg = (message || '').toLowerCase();

    switch (status) {
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'GitHub authentication failed. Please reconnect.',
          category: 'auth',
          recoverable: true,
        };
      case 403:
        if (normalizedMsg.includes('rate limit')) {
          return {
            code: 'RATE_LIMITED',
            message: 'GitHub API rate limit exceeded. Please try again later.',
            category: 'rate_limit',
            recoverable: true,
            retryAfter: Math.max(0, this.rateLimitReset - Date.now()) / 1000,
          };
        }
        if (normalizedMsg.includes('resource not accessible by integration')) {
          return {
            code: 'INTEGRATION_PERMISSION',
            message: 'GitHub App lacks required permissions. Please use a standard OAuth App or enable repository permissions in your GitHub App settings.',
            category: 'permission',
            recoverable: false,
          };
        }
        return {
          code: 'FORBIDDEN',
          message: 'Access denied to this repository.',
          category: 'permission',
          recoverable: false,
        };
      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'Repository or resource not found.',
          category: 'not_found',
          recoverable: false,
        };
      case 409:
        return {
          code: 'CONFLICT',
          message: 'Conflict detected. The file may have been modified.',
          category: 'conflict',
          recoverable: true,
        };
      case 422:
        return {
          code: 'VALIDATION_ERROR',
          message: message || 'Invalid request data.',
          category: 'unknown',
          recoverable: false,
        };
      default:
        return {
          code: 'UNKNOWN',
          message: message || `GitHub API error (${status})`,
          category: 'network',
          recoverable: true,
        };
    }
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  /**
   * Get authenticated user info
   */
  async getUser(token: string): Promise<GitHubUser> {
    const data = await this.githubFetch<{
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
    }>('/user', token);

    return {
      id: data.id,
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  }

  /**
   * List user's repositories
   */
  async listRepos(token: string): Promise<GitHubRepo[]> {
    const data = await this.githubFetch<Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      default_branch: string;
      owner: { login: string };
    }>>('/user/repos?per_page=100&sort=updated', token);

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      owner: { login: repo.owner.login },
    }));
  }

  // ============================================================================
  // Repository Content Operations
  // ============================================================================

  /**
   * Get contents of a path in repository
   */
  async getContents(
    token: string,
    repo: string,
    path: string
  ): Promise<Array<{ name: string; path: string; sha: string; type: 'file' | 'dir' }>> {
    try {
      const data = await this.githubFetch<Array<{
        name: string;
        path: string;
        sha: string;
        type: 'file' | 'dir';
      }>>(`/repos/${repo}/contents/${path}`, token);

      return Array.isArray(data) ? data : [];
    } catch (error) {
      // 404 means folder doesn't exist - return empty
      if ((error as Error & { classified?: GitHubClassifiedError }).classified?.category === 'not_found') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a single file's content
   */
  async getFileContent(
    token: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string }> {
    const data = await this.githubFetch<{
      content: string;
      sha: string;
      encoding: string;
    }>(`/repos/${repo}/contents/${path}`, token);

    // Decode base64 content
    const content = data.encoding === 'base64'
      ? Buffer.from(data.content, 'base64').toString('utf8')
      : data.content;

    return { content, sha: data.sha };
  }

  /**
   * Create or update a file
   */
  async createOrUpdateFile(
    token: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string // Required for updates
  ): Promise<{ sha: string }> {
    const body: Record<string, string> = {
      message,
      content: Buffer.from(content).toString('base64'),
    };

    if (sha) {
      body.sha = sha;
    }

    const data = await this.githubFetch<{
      content: { sha: string };
    }>(`/repos/${repo}/contents/${path}`, token, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return { sha: data.content.sha };
  }

  /**
   * Delete a file
   */
  async deleteFile(
    token: string,
    repo: string,
    path: string,
    sha: string,
    message: string
  ): Promise<void> {
    await this.githubFetch(`/repos/${repo}/contents/${path}`, token, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha }),
    });
  }

  /**
   * Check if repository exists and user has access
   */
  async checkRepoAccess(token: string, repo: string): Promise<boolean> {
    try {
      await this.githubFetch(`/repos/${repo}`, token);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new repository
   */
  async createRepo(
    token: string,
    name: string,
    isPrivate: boolean = true
  ): Promise<GitHubRepo> {
    const data = await this.githubFetch<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      default_branch: string;
      owner: { login: string };
    }>('/user/repos', token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true, // Initialize with README
        description: 'Notes synced from Sandbooks',
      }),
    });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch,
      owner: { login: data.owner.login },
    };
  }

  // ============================================================================
  // Note Sync Operations
  // ============================================================================

  /**
   * Convert Note to Markdown with YAML frontmatter
   */
  noteToMarkdown(note: {
    id: string;
    title: string;
    content: unknown;
    createdAt: string;
    updatedAt: string;
    tags?: Array<{ name: string }>;
    isSystemDoc?: boolean;
    folderId?: string | null;
  }, folderPath?: string | null): string {
    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };

    if (note.tags && note.tags.length > 0) {
      frontmatter.tags = note.tags.map(t => t.name);
    }

    if (note.isSystemDoc) {
      frontmatter.isSystemDoc = true;
    }

    // Add folder information
    if (note.folderId) {
      frontmatter.folderId = note.folderId;
    }
    if (folderPath) {
      frontmatter.folderPath = folderPath;
    }

    // Convert JSONContent to markdown (simplified)
    const bodyMarkdown = this.jsonContentToMarkdown(note.content);

    // Build final markdown
    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join('\n');

    return `---\n${yaml}\n---\n\n${bodyMarkdown}`;
  }

  /**
   * Parse Markdown with YAML frontmatter to Note
   */
  markdownToNote(markdown: string, filename: string): {
    id: string;
    title: string;
    content: unknown;
    createdAt: string;
    updatedAt: string;
    tags?: Array<{ id: string; name: string; color: string }>;
    isSystemDoc?: boolean;
    folderId?: string | null;
    folderPath?: string | null;
  } | null {
    // Extract frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
      logger.warn('Failed to parse frontmatter', { filename });
      return null;
    }

    const [, frontmatterYaml, body] = frontmatterMatch;

    // Parse YAML (simple key-value parser)
    const frontmatter: Record<string, unknown> = {};
    let currentKey = '';
    let inArray = false;
    const arrayValues: string[] = [];

    for (const line of frontmatterYaml.split('\n')) {
      if (line.startsWith('  - ') && inArray) {
        arrayValues.push(line.slice(4));
      } else if (line.includes(':')) {
        if (inArray && currentKey) {
          frontmatter[currentKey] = arrayValues.slice();
          arrayValues.length = 0;
        }
        inArray = false;

        const colonIndex = line.indexOf(':');
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        if (value === '') {
          // Might be start of array
          currentKey = key;
          inArray = true;
        } else {
          // Parse JSON value or use as string
          try {
            frontmatter[key] = JSON.parse(value);
          } catch {
            frontmatter[key] = value;
          }
        }
      }
    }

    // Handle trailing array
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayValues;
    }

    const id = (frontmatter.id as string) || filename.replace('.md', '');
    const title = (frontmatter.title as string) || 'Untitled';
    const createdAt = (frontmatter.createdAt as string) || new Date().toISOString();
    const updatedAt = (frontmatter.updatedAt as string) || new Date().toISOString();
    const tagNames = (frontmatter.tags as string[]) || [];
    const isSystemDoc = frontmatter.isSystemDoc === true;
    const folderId = (frontmatter.folderId as string) || null;
    const folderPath = (frontmatter.folderPath as string) || null;

    // Convert markdown body to JSONContent
    const content = this.markdownToJsonContent(body);

    // Build tags with generated IDs
    const tags = tagNames.map(name => ({
      id: `tag-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      color: 'gray' as const,
    }));

    return {
      id,
      title,
      content,
      createdAt,
      updatedAt,
      tags: tags.length > 0 ? tags : undefined,
      isSystemDoc: isSystemDoc || undefined,
      folderId: folderId || undefined,
      folderPath: folderPath || undefined,
    };
  }

  /**
   * Convert JSONContent to Markdown (simplified)
   */
  private jsonContentToMarkdown(content: unknown): string {
    if (!content || typeof content !== 'object') return '';

    const doc = content as { type?: string; content?: unknown[] };
    if (doc.type !== 'doc' || !Array.isArray(doc.content)) return '';

    return doc.content
      .map(node => this.nodeToMarkdown(node))
      .join('\n\n');
  }

  private nodeToMarkdown(node: unknown): string {
    if (!node || typeof node !== 'object') return '';

    const n = node as {
      type?: string;
      content?: unknown[];
      text?: string;
      attrs?: Record<string, unknown>;
      marks?: Array<{ type: string }>;
    };

    switch (n.type) {
      case 'paragraph':
        return n.content?.map(c => this.nodeToMarkdown(c)).join('') || '';

      case 'heading': {
        const level = (n.attrs?.level as number) || 1;
        const text = n.content?.map(c => this.nodeToMarkdown(c)).join('') || '';
        return '#'.repeat(level) + ' ' + text;
      }

      case 'text': {
        let text = n.text || '';
        if (n.marks) {
          for (const mark of n.marks) {
            if (mark.type === 'bold') text = `**${text}**`;
            if (mark.type === 'italic') text = `*${text}*`;
            if (mark.type === 'code') text = `\`${text}\``;
          }
        }
        return text;
      }

      case 'codeBlock':
      case 'executableCodeBlock': {
        const code = n.attrs?.code || n.content?.map(c => this.nodeToMarkdown(c)).join('') || '';
        const lang = n.attrs?.language || '';
        return '```' + lang + '\n' + code + '\n```';
      }

      case 'bulletList':
        return n.content?.map(c => '- ' + this.nodeToMarkdown(c)).join('\n') || '';

      case 'orderedList':
        return n.content?.map((c, i) => `${i + 1}. ` + this.nodeToMarkdown(c)).join('\n') || '';

      case 'listItem':
        return n.content?.map(c => this.nodeToMarkdown(c)).join('') || '';

      case 'blockquote':
        return n.content?.map(c => '> ' + this.nodeToMarkdown(c)).join('\n') || '';

      case 'horizontalRule':
        return '---';

      default:
        return n.content?.map(c => this.nodeToMarkdown(c)).join('') || '';
    }
  }

  /**
   * Convert Markdown to JSONContent (simplified)
   */
  private markdownToJsonContent(markdown: string): unknown {
    const lines = markdown.split('\n');
    const content: unknown[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.startsWith('```')) {
        const lang = line.slice(3);
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        content.push({
          type: 'executableCodeBlock',
          attrs: {
            code: codeLines.join('\n'),
            language: lang || 'javascript',
          },
        });
        i++;
        continue;
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        content.push({
          type: 'heading',
          attrs: { level: headingMatch[1].length },
          content: [{ type: 'text', text: headingMatch[2] }],
        });
        i++;
        continue;
      }

      // Horizontal rule
      if (line === '---' || line === '***' || line === '___') {
        content.push({ type: 'horizontalRule' });
        i++;
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Regular paragraph
      content.push({
        type: 'paragraph',
        content: this.parseInlineMarkdown(line),
      });
      i++;
    }

    return { type: 'doc', content };
  }

  private parseInlineMarkdown(text: string): unknown[] {
    // Simple text for now - could be enhanced to handle bold/italic/code
    return [{ type: 'text', text }];
  }

  /**
   * Build folder path map from folder array
   */
  private buildFolderPathMap(folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
  }>): Map<string, string> {
    const pathMap = new Map<string, string>();
    const folderById = new Map(folders.map(f => [f.id, f]));

    const computePath = (folderId: string): string => {
      if (pathMap.has(folderId)) return pathMap.get(folderId)!;

      const folder = folderById.get(folderId);
      if (!folder) return '';

      if (!folder.parentId) {
        const path = slugify(folder.name);
        pathMap.set(folderId, path);
        return path;
      }

      const parentPath = computePath(folder.parentId);
      const path = parentPath ? `${parentPath}/${slugify(folder.name)}` : slugify(folder.name);
      pathMap.set(folderId, path);
      return path;
    };

    folders.forEach(f => computePath(f.id));
    return pathMap;
  }

  /**
   * Push notes to GitHub repository
   */
  async pushNotes(
    token: string,
    repo: string,
    path: string,
    notes: Array<{
      id: string;
      title: string;
      content: unknown;
      createdAt: string;
      updatedAt: string;
      tags?: Array<{ id: string; name: string; color: string }>;
      isSystemDoc?: boolean;
      folderId?: string | null;
    }>,
    message?: string,
    folders?: Array<{
      id: string;
      name: string;
      parentId: string | null;
      sortOrder: number;
      color?: string;
      icon?: string;
      createdAt?: string;
      updatedAt?: string;
    }>,
    deletedFolderIds?: string[]
  ): Promise<SyncPushResponse> {
    logger.info('Pushing notes to GitHub', {
      repo,
      path,
      noteCount: notes.length,
      folderCount: folders?.length || 0,
    });

    // Build folder path map
    const folderPathMap = folders ? this.buildFolderPathMap(folders) : new Map<string, string>();

    // Get existing files and build map by note ID (from frontmatter)
    const existingFiles = await this.getContents(token, repo, `${path}/notes`);
    const existingByFilename = new Map(existingFiles.map(f => [f.name, f]));
    const existingById = new Map<string, { filename: string; sha: string }>();

    // Parse existing files to extract note IDs for rename detection
    for (const file of existingFiles) {
      if (!file.name.endsWith('.md')) continue;
      try {
        const { content } = await this.getFileContent(token, repo, file.path);
        const idMatch = content.match(/^---\n[\s\S]*?^id:\s*"?([^"\n]+)"?\s*$/m);
        if (idMatch) {
          existingById.set(idMatch[1], { filename: file.name, sha: file.sha || '' });
        }
      } catch {
        // Skip files we can't parse
      }
    }

    let filesCreated = 0;
    let filesUpdated = 0;
    let filesDeleted = 0;
    let lastSha = '';

    // Track slugs to handle duplicates
    const usedSlugs = new Set<string>();

    // Create/update notes
    for (const note of notes) {
      // Generate slug from title, handle duplicates by appending short ID
      const baseSlug = slugify(note.title);
      let filename = `${baseSlug}.md`;
      if (usedSlugs.has(baseSlug)) {
        filename = `${baseSlug}-${note.id.slice(0, 8)}.md`;
      }
      usedSlugs.add(baseSlug);

      const filePath = `${path}/notes/${filename}`;

      // Get folder path for the note
      const folderPath = note.folderId ? folderPathMap.get(note.folderId) : null;
      const markdown = this.noteToMarkdown(note, folderPath);

      // Check if this note exists under a different filename (renamed)
      const existingEntry = existingById.get(note.id);
      if (existingEntry && existingEntry.filename !== filename) {
        // Note was renamed - delete old file first
        try {
          await this.deleteFile(
            token,
            repo,
            `${path}/notes/${existingEntry.filename}`,
            `sandbooks: rename ${existingEntry.filename} → ${filename}`,
            existingEntry.sha
          );
          filesDeleted++;
          existingByFilename.delete(existingEntry.filename);
        } catch (err) {
          logger.warn('Failed to delete old file during rename', {
            oldFile: existingEntry.filename,
            error: getErrorMessage(err),
          });
        }
      }

      const existingFile = existingByFilename.get(filename);
      const commitMessage = message || `sandbooks: ${existingFile ? 'update' : 'create'} ${note.title}`;

      const result = await this.createOrUpdateFile(
        token,
        repo,
        filePath,
        markdown,
        commitMessage,
        existingFile?.sha
      );

      lastSha = result.sha;
      if (existingFile || existingEntry) {
        filesUpdated++;
        existingByFilename.delete(filename);
      } else {
        filesCreated++;
      }
    }

    // Delete orphaned files (notes deleted locally but still in GitHub)
    for (const [filename, file] of existingByFilename) {
      if (!filename.endsWith('.md')) continue;

      try {
        await this.deleteFile(
          token,
          repo,
          `${path}/notes/${filename}`,
          file.sha,
          message || `sandbooks: delete ${filename}`
        );
        filesDeleted++;
        logger.info('Deleted orphaned file from GitHub', { filename });
      } catch (err) {
        logger.warn('Failed to delete orphaned file', {
          filename,
          error: getErrorMessage(err),
        });
      }
    }

    // Save folder metadata as .folders.json
    if (folders && folders.length > 0) {
      const foldersJson = JSON.stringify({
        folders: folders.map(f => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          sortOrder: f.sortOrder,
          color: f.color,
          icon: f.icon,
          createdAt: f.createdAt || new Date().toISOString(),
          updatedAt: f.updatedAt || new Date().toISOString(),
        })),
        deletedFolderIds: deletedFolderIds || [],
      }, null, 2);
      const foldersPath = `${path}/.folders.json`;

      try {
        // Try to get existing .folders.json for SHA
        let existingSha: string | undefined;
        try {
          const existing = await this.getFileContent(token, repo, foldersPath);
          existingSha = existing.sha;
        } catch {
          // File doesn't exist yet
        }

        await this.createOrUpdateFile(
          token,
          repo,
          foldersPath,
          foldersJson,
          message || 'sandbooks: update folder structure',
          existingSha
        );
        logger.info('Saved folder metadata to GitHub', { folderCount: folders.length });
      } catch (err) {
        logger.warn('Failed to save folder metadata', { error: getErrorMessage(err) });
      }
    }

    return {
      success: true,
      sha: lastSha,
      syncedAt: new Date().toISOString(),
      filesCreated,
      filesUpdated,
      filesDeleted,
    };
  }

  /**
   * Pull notes from GitHub repository
   */
  async pullNotes(
    token: string,
    repo: string,
    path: string
  ): Promise<SyncPullResponse> {
    logger.info('Pulling notes from GitHub', { repo, path });

    // Try to load folder metadata from .folders.json
    let folders: SyncPullResponse['folders'] = [];
    let deletedFolderIds: string[] = [];
    try {
      const { content: foldersJson } = await this.getFileContent(token, repo, `${path}/.folders.json`);
      const parsed = JSON.parse(foldersJson) as {
        folders?: Array<{
          id: string;
          name: string;
          parentId: string | null;
          sortOrder: number;
          color?: string;
          icon?: string;
          createdAt?: string;
          updatedAt?: string;
        }>;
        deletedFolderIds?: string[];
      } | Array<{
        id: string;
        name: string;
        parentId: string | null;
        sortOrder: number;
        color?: string;
        icon?: string;
        createdAt?: string;
        updatedAt?: string;
      }>;

      // Support both new format { folders: [...], deletedFolderIds: [...] }
      // and legacy format [...] (direct array)
      const parsedFolders = Array.isArray(parsed) ? parsed : (parsed.folders || []);
      deletedFolderIds = Array.isArray(parsed) ? [] : (parsed.deletedFolderIds || []);

      // Validate folder hierarchy for cycles
      this.validateFolderHierarchy(parsedFolders);

      // Build path map for folders
      const pathMap = this.buildFolderPathMap(parsedFolders);
      const now = new Date().toISOString();

      folders = parsedFolders.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        path: pathMap.get(f.id) || '',
        sortOrder: f.sortOrder,
        color: f.color,
        icon: f.icon,
        createdAt: f.createdAt || now,
        updatedAt: f.updatedAt || now,
      }));

      logger.info('Loaded folder metadata from GitHub', {
        folderCount: folders.length,
        deletedCount: deletedFolderIds.length,
      });
    } catch (err) {
      // No folder metadata found or parse error - that's ok
      const errorMsg = getErrorMessage(err);
      if (errorMsg.includes('Circular folder reference')) {
        logger.error('Invalid folder hierarchy in GitHub', { error: errorMsg });
        throw new Error(`GitHub sync failed: ${errorMsg}`);
      }
      logger.debug('No folder metadata found in GitHub repo');
    }

    // Get list of files
    const files = await this.getContents(token, repo, `${path}/notes`);
    const mdFiles = files.filter(f => f.name.endsWith('.md') && f.type === 'file');

    const notes: SyncPullResponse['notes'] = [];

    for (const file of mdFiles) {
      try {
        const { content } = await this.getFileContent(token, repo, file.path);
        const note = this.markdownToNote(content, file.name);
        if (note) {
          notes.push(note);
        }
      } catch (error) {
        logger.error('Failed to parse note file', {
          file: file.path,
          error: getErrorMessage(error),
        });
      }
    }

    logger.info('Pulled notes from GitHub', { noteCount: notes.length, folderCount: folders.length });

    return {
      notes,
      folders: folders.length > 0 ? folders : undefined,
      deletedFolderIds: deletedFolderIds.length > 0 ? deletedFolderIds : undefined,
      sha: mdFiles[0]?.sha || '',
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate folder hierarchy for circular references
   */
  private validateFolderHierarchy(folders: Array<{ id: string; parentId: string | null }>): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const folderById = new Map(folders.map(f => [f.id, f]));

    const detectCycle = (id: string): boolean => {
      if (visiting.has(id)) return true; // Cycle detected
      if (visited.has(id)) return false;

      visiting.add(id);
      const folder = folderById.get(id);
      if (folder?.parentId && folderById.has(folder.parentId)) {
        if (detectCycle(folder.parentId)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const folder of folders) {
      if (detectCycle(folder.id)) {
        throw new Error(`Circular folder reference detected: ${folder.id}`);
      }
    }
  }

  /**
   * Revoke OAuth token (optional - GitHub doesn't have a direct revoke API for OAuth Apps)
   * We just acknowledge the disconnect on our end
   */
  async revokeToken(): Promise<void> {
    // GitHub OAuth App tokens don't have a revoke endpoint
    // The user can revoke from GitHub settings
    logger.info('GitHub token revoked (client-side only)');
  }
}

// Export singleton instance
export default new GitHubService();
