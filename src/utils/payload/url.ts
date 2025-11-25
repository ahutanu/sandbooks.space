/**
 * Payload URL Utilities
 *
 * Handle parsing and creating payload URLs.
 * URL format: https://sandbooks.space/#/p/{token}
 */

import { PAYLOAD_CONSTANTS } from '../../types/payload.types';

export interface ParsedPayloadUrl {
  isPayload: true;
  token: string;
}

export interface NotPayloadUrl {
  isPayload: false;
}

export type PayloadUrlResult = ParsedPayloadUrl | NotPayloadUrl;

/**
 * Parse a URL to check if it's a payload link and extract the token
 */
export function parsePayloadUrl(url: string): PayloadUrlResult {
  try {
    // Handle both full URLs and just hash fragments
    let hash: string;

    if (url.startsWith('#')) {
      hash = url;
    } else {
      const urlObj = new URL(url);
      hash = urlObj.hash;
    }

    // Check for payload route prefix
    if (!hash.startsWith(PAYLOAD_CONSTANTS.URL_PREFIX)) {
      return { isPayload: false };
    }

    // Extract token (everything after the prefix)
    const token = hash.slice(PAYLOAD_CONSTANTS.URL_PREFIX.length);

    // Basic token validation
    if (!token || token.length < 4) {
      return { isPayload: false };
    }

    // Check for valid base64url characters only
    if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      return { isPayload: false };
    }

    return { isPayload: true, token };
  } catch {
    return { isPayload: false };
  }
}

/**
 * Check if the current page URL is a payload link
 */
export function isCurrentUrlPayload(): PayloadUrlResult {
  if (typeof window === 'undefined') {
    return { isPayload: false };
  }

  return parsePayloadUrl(window.location.hash);
}

/**
 * Create a full payload URL from a token
 */
export function createPayloadUrl(token: string): string {
  const base = getBaseUrl();
  return `${base}${PAYLOAD_CONSTANTS.URL_PREFIX}${token}`;
}

/**
 * Create just the hash portion of a payload URL
 */
export function createPayloadHash(token: string): string {
  return `${PAYLOAD_CONSTANTS.URL_PREFIX}${token}`;
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://sandbooks.space/';
  }

  // Use current origin and pathname (without hash)
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

/**
 * Clear the payload hash from the URL without navigation
 */
export function clearPayloadFromUrl(): void {
  if (typeof window === 'undefined') return;

  // Replace with empty hash or original path
  const { origin, pathname } = window.location;
  window.history.replaceState(null, '', `${origin}${pathname}`);
}

/**
 * Update the URL to show the payload hash without navigation
 */
export function setPayloadInUrl(token: string): void {
  if (typeof window === 'undefined') return;

  const hash = createPayloadHash(token);
  window.history.replaceState(null, '', hash);
}

/**
 * Check if the URL has any hash (payload or otherwise)
 */
export function hasUrlHash(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash.length > 1;
}

/**
 * Get the raw hash value (without #)
 */
export function getUrlHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash.slice(1);
}
