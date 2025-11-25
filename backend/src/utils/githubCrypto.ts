import crypto from 'crypto';
import type { OAuthState } from '../types/github.types';

// ============================================================================
// Token Encryption (AES-256-GCM with device-derived key)
// ============================================================================

/**
 * Encrypt a GitHub OAuth token for secure storage on the frontend.
 * Uses HKDF to derive a device-specific key from the CLIENT_SECRET.
 */
export function encryptToken(token: string, deviceId: string, clientSecret: string): string {
  // Derive device-specific key using HKDF
  const keyBuffer = crypto.hkdfSync(
    'sha256',
    clientSecret,
    deviceId,
    'sandbooks-github-token',
    32 // 256 bits for AES-256
  );
  const key = Buffer.from(keyBuffer);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);

  // Encrypt with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Return: base64(iv + authTag + encrypted)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt a GitHub OAuth token received from the frontend.
 */
export function decryptToken(encryptedToken: string, deviceId: string, clientSecret: string): string {
  const data = Buffer.from(encryptedToken, 'base64');

  // Extract components
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  // Derive same key
  const keyBuffer = crypto.hkdfSync(
    'sha256',
    clientSecret,
    deviceId,
    'sandbooks-github-token',
    32
  );
  const key = Buffer.from(keyBuffer);

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// ============================================================================
// OAuth State CSRF Protection (signed state parameter)
// ============================================================================

/**
 * Generate a signed OAuth state parameter for CSRF protection.
 * State is a signed JSON payload containing deviceId, timestamp, and nonce.
 */
export function generateOAuthState(deviceId: string, clientSecret: string): string {
  const payload: OAuthState = {
    deviceId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', clientSecret)
    .update(data)
    .digest('hex');

  return Buffer.from(JSON.stringify({ data, signature })).toString('base64url');
}

/**
 * Verify and decode an OAuth state parameter.
 * Returns the deviceId if valid, null if invalid or expired.
 */
export function verifyOAuthState(
  state: string,
  clientSecret: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): { deviceId: string } | null {
  try {
    const { data, signature } = JSON.parse(
      Buffer.from(state, 'base64url').toString()
    );
    const payload: OAuthState = JSON.parse(data);

    // Verify signature using timing-safe comparison
    const expectedSig = crypto
      .createHmac('sha256', clientSecret)
      .update(data)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    )) {
      return null;
    }

    // Check timestamp (prevent replay attacks)
    if (Date.now() - payload.timestamp > maxAgeMs) {
      return null;
    }

    return { deviceId: payload.deviceId };
  } catch {
    return null;
  }
}

// ============================================================================
// Utility: Sanitize sensitive data for logging
// ============================================================================

/**
 * Redact sensitive tokens for safe logging
 */
export function redactToken(token: string | undefined | null): string {
  if (!token) return '[EMPTY]';
  if (token.length <= 8) return '[REDACTED]';
  return `${token.substring(0, 4)}...[REDACTED]`;
}
