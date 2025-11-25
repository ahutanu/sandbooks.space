import { Router } from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import {
  OAuthCallbackSchema,
  RepoSelectSchema,
  SyncPushSchema,
  SyncPullSchema,
} from '../types/github.types';
import {
  getAuthUrl,
  handleCallback,
  revokeAuth,
  listRepos,
  selectRepo,
  pushNotes,
  pullNotes,
  getUser,
} from '../controllers/github.controller';

const router = Router();

/**
 * GitHub Routes
 * Base path: /api/github
 */

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * GET /api/github/oauth/url
 * Get the GitHub OAuth authorization URL
 * Query: deviceId (required)
 */
router.get('/oauth/url', getAuthUrl);

/**
 * POST /api/github/oauth/callback
 * Exchange OAuth code for encrypted access token
 * Body: { code, state, deviceId }
 */
router.post('/oauth/callback', validateRequest(OAuthCallbackSchema), handleCallback);

/**
 * DELETE /api/github/oauth/revoke
 * Disconnect GitHub (revoke token)
 * Headers: X-GitHub-Token, X-Device-ID
 */
router.delete('/oauth/revoke', revokeAuth);

// ============================================================================
// User & Repository Management
// ============================================================================

/**
 * GET /api/github/user
 * Get authenticated GitHub user info
 * Headers: X-GitHub-Token, X-Device-ID
 */
router.get('/user', getUser);

/**
 * GET /api/github/repos
 * List user's repositories
 * Headers: X-GitHub-Token, X-Device-ID
 */
router.get('/repos', listRepos);

/**
 * POST /api/github/repos/select
 * Select and optionally create a repository for sync
 * Headers: X-GitHub-Token, X-Device-ID
 * Body: { repo, path, createIfMissing }
 */
router.post('/repos/select', validateRequest(RepoSelectSchema), selectRepo);

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * POST /api/github/sync/push
 * Push notes to GitHub repository
 * Headers: X-GitHub-Token, X-Device-ID
 * Body: { repo, path, notes, message? }
 */
router.post('/sync/push', validateRequest(SyncPushSchema), pushNotes);

/**
 * POST /api/github/sync/pull
 * Pull notes from GitHub repository
 * Headers: X-GitHub-Token, X-Device-ID
 * Body: { repo, path }
 */
router.post('/sync/pull', validateRequest(SyncPullSchema), pullNotes);

export default router;
