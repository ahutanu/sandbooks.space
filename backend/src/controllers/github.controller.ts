import { Request, Response, NextFunction } from 'express';
import gitHubService from '../services/github.service';
import logger from '../utils/logger';
import { redactToken } from '../utils/githubCrypto';
import { AppError } from '../utils/errors';
import type {
  OAuthCallbackRequest,
  RepoSelectRequest,
  SyncPushRequest,
  SyncPullRequest,
  GitHubClassifiedError,
} from '../types/github.types';

// ============================================================================
// Helper: Extract and decrypt token from headers
// ============================================================================

function getTokenFromHeaders(req: Request): { token: string; deviceId: string } {
  const encryptedToken = req.headers['x-github-token'] as string;
  const deviceId = req.headers['x-device-id'] as string;

  if (!encryptedToken || !deviceId) {
    throw new AppError(401, 'Missing GitHub authentication headers');
  }

  try {
    const token = gitHubService.decryptTokenFromDevice(encryptedToken, deviceId);
    return { token, deviceId };
  } catch (_error) {
    logger.error('Failed to decrypt GitHub token', { deviceId });
    throw new AppError(401, 'Invalid GitHub token');
  }
}

// ============================================================================
// OAuth Endpoints
// ============================================================================

/**
 * GET /api/github/oauth/url
 * Returns the GitHub OAuth authorization URL
 */
export const getAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.query.deviceId as string;

    if (!deviceId || deviceId.length < 16) {
      return res.status(400).json({ error: 'Device ID is required (min 16 characters)' });
    }

    if (!gitHubService.isConfigured()) {
      return res.status(503).json({ error: 'GitHub integration is not configured' });
    }

    const url = gitHubService.getAuthUrl(deviceId);

    logger.info('Generated GitHub OAuth URL', { deviceId: redactToken(deviceId) });

    res.json({ url });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/github/oauth/callback
 * Exchange OAuth code for encrypted access token
 */
export const handleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, deviceId } = req.body as OAuthCallbackRequest;

    logger.info('GitHub OAuth callback received', { deviceId: redactToken(deviceId) });

    // Verify state (CSRF protection)
    const verified = gitHubService.verifyState(state);
    if (!verified) {
      logger.warn('OAuth state verification failed', { deviceId: redactToken(deviceId) });
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    if (verified.deviceId !== deviceId) {
      logger.warn('OAuth device ID mismatch', {
        expected: redactToken(verified.deviceId),
        received: redactToken(deviceId),
      });
      return res.status(400).json({ error: 'Device ID mismatch' });
    }

    // Exchange code for token
    const tokenResponse = await gitHubService.exchangeCodeForToken(code);

    // Get user info
    const user = await gitHubService.getUser(tokenResponse.accessToken);

    // Encrypt token for frontend storage
    const encryptedToken = gitHubService.encryptTokenForDevice(
      tokenResponse.accessToken,
      deviceId
    );

    logger.info('GitHub OAuth successful', {
      user: user.login,
      deviceId: redactToken(deviceId),
    });

    res.json({
      encryptedToken,
      user,
    });
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/github/oauth/revoke
 * Disconnect GitHub (revoke token)
 */
export const revokeAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId } = getTokenFromHeaders(req);

    await gitHubService.revokeToken();

    logger.info('GitHub disconnected', { deviceId: redactToken(deviceId) });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// Repository Endpoints
// ============================================================================

/**
 * GET /api/github/repos
 * List user's repositories
 */
export const listRepos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, deviceId } = getTokenFromHeaders(req);

    logger.debug('Listing GitHub repos', { deviceId: redactToken(deviceId) });

    const repos = await gitHubService.listRepos(token);

    res.json({ repos });
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};

/**
 * POST /api/github/repos/select
 * Select and optionally create a repository for sync
 */
export const selectRepo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, deviceId } = getTokenFromHeaders(req);
    const { repo, path, createIfMissing } = req.body as RepoSelectRequest;

    logger.info('Selecting GitHub repo', {
      repo,
      path,
      createIfMissing,
      deviceId: redactToken(deviceId),
    });

    // Check if repo exists
    const hasAccess = await gitHubService.checkRepoAccess(token, repo);

    if (!hasAccess) {
      if (createIfMissing) {
        // Create the repository
        const [, repoName] = repo.split('/');
        const newRepo = await gitHubService.createRepo(token, repoName, true);

        logger.info('Created new GitHub repo', { repo: newRepo.fullName });

        // Wait for GitHub to propagate the new repo (race condition fix)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Create the notes folder structure with retry logic
        let retries = 3;
        let lastError: Error | null = null;
        while (retries > 0) {
          try {
            await gitHubService.createOrUpdateFile(
              token,
              newRepo.fullName,
              `${path}/README.md`,
              `# Sandbooks Notes\n\nThis folder contains notes synced from [Sandbooks](https://sandbooks.space).\n`,
              'sandbooks: initialize sync folder'
            );
            break; // Success
          } catch (err) {
            lastError = err as Error;
            retries--;
            if (retries > 0) {
              logger.warn('Retrying folder creation after delay', { retries, repo: newRepo.fullName });
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        if (retries === 0 && lastError) {
          logger.error('Failed to create sync folder after retries', { repo: newRepo.fullName });
          // Repo was created but folder creation failed - still return success
          // The folder will be created on first sync
        }

        return res.json({
          success: true,
          repo: newRepo,
          created: true,
        });
      }

      return res.status(404).json({ error: 'Repository not found or no access' });
    }

    // Ensure sync folder exists
    const contents = await gitHubService.getContents(token, repo, path);
    if (contents.length === 0) {
      // Create the folder with a README
      await gitHubService.createOrUpdateFile(
        token,
        repo,
        `${path}/README.md`,
        `# Sandbooks Notes\n\nThis folder contains notes synced from [Sandbooks](https://sandbooks.space).\n`,
        'sandbooks: initialize sync folder'
      );
    }

    res.json({
      success: true,
      repo: { fullName: repo },
      created: false,
    });
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};

// ============================================================================
// Sync Endpoints
// ============================================================================

/**
 * POST /api/github/sync/push
 * Push notes to GitHub repository
 */
export const pushNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, deviceId } = getTokenFromHeaders(req);
    const { repo, path, notes, message } = req.body as SyncPushRequest;

    logger.info('Pushing notes to GitHub', {
      repo,
      path,
      noteCount: notes.length,
      deviceId: redactToken(deviceId),
    });

    // Type assertion: notes from validated request body always have content
    const result = await gitHubService.pushNotes(
      token,
      repo,
      path,
      notes as Array<{
        id: string;
        title: string;
        content: unknown;
        createdAt: string;
        updatedAt: string;
        tags?: Array<{ id: string; name: string; color: string }>;
        isSystemDoc?: boolean;
      }>,
      message
    );

    res.json(result);
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};

/**
 * POST /api/github/sync/pull
 * Pull notes from GitHub repository
 */
export const pullNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, deviceId } = getTokenFromHeaders(req);
    const { repo, path } = req.body as SyncPullRequest;

    logger.info('Pulling notes from GitHub', {
      repo,
      path,
      deviceId: redactToken(deviceId),
    });

    const result = await gitHubService.pullNotes(token, repo, path);

    res.json(result);
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};

/**
 * GET /api/github/user
 * Get authenticated GitHub user info
 */
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, deviceId } = getTokenFromHeaders(req);

    logger.debug('Getting GitHub user', { deviceId: redactToken(deviceId) });

    const user = await gitHubService.getUser(token);

    res.json({ user });
  } catch (error) {
    const classified = (error as Error & { classified?: GitHubClassifiedError }).classified;
    if (classified) {
      return res.status(classified.category === 'auth' ? 401 : 500).json({
        error: classified.message,
        code: classified.code,
      });
    }
    next(error);
  }
};
