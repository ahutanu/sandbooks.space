/**
 * Payload Decoder
 *
 * Decodes a URL token back into a Note using:
 * 1. Base64url decoding
 * 2. DEFLATE decompression (pako)
 * 3. MessagePack deserialization
 * 4. PayloadNote → Note mapping
 * 5. Validation and expiry checks
 */

import { decode as msgpackDecode } from '@msgpack/msgpack';
import pako from 'pako';
import type { Note } from '../../types';
import {
  type PayloadNote,
  type DecodeResult,
  PAYLOAD_CONSTANTS,
  PayloadDecodeError,
  PayloadExpiredError,
  PayloadVersionError,
} from '../../types/payload.types';
import { payloadToNote, validatePayloadStructure, countPayloadNodes } from './mappers';

/**
 * Decode a URL token back into a Note
 */
export function decodePayload(token: string): DecodeResult {
  // Validate token format
  if (!token || typeof token !== 'string') {
    throw new PayloadDecodeError('Missing token', 'This link is incomplete');
  }

  if (token.length < 4) {
    throw new PayloadDecodeError('Token too short', 'This link is incomplete');
  }

  // Check for valid base64url characters
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new PayloadDecodeError(
      'Invalid characters in token',
      'This link is corrupted or incomplete'
    );
  }

  // Step 1: Base64url decode
  let compressed: Uint8Array;
  try {
    compressed = base64urlDecode(token);
  } catch (e) {
    throw new PayloadDecodeError(
      `Base64 decode failed: ${e}`,
      'This link contains invalid data'
    );
  }

  // Step 2: Decompress
  let msgpackData: Uint8Array;
  try {
    msgpackData = pako.inflate(compressed);
  } catch (e) {
    throw new PayloadDecodeError(
      `Decompression failed: ${e}`,
      'This link is corrupted or incomplete. It may have been truncated when shared.'
    );
  }

  // Check decompressed size limit
  if (msgpackData.length > PAYLOAD_CONSTANTS.MAX_DECOMPRESSED_SIZE) {
    throw new PayloadDecodeError(
      'Decompressed data too large',
      'This link contains too much data'
    );
  }

  // Step 3: Deserialize MessagePack
  let payload: unknown;
  try {
    payload = msgpackDecode(msgpackData);
  } catch (e) {
    throw new PayloadDecodeError(
      `MessagePack decode failed: ${e}`,
      'This link format is not recognized'
    );
  }

  // Step 4: Validate structure
  if (!validatePayloadStructure(payload)) {
    throw new PayloadDecodeError(
      'Invalid payload structure',
      'This link is missing required data'
    );
  }

  const typedPayload = payload as PayloadNote;

  // Step 5: Check version
  if (typedPayload.v > PAYLOAD_CONSTANTS.CURRENT_VERSION) {
    throw new PayloadVersionError(typedPayload.v, {
      min: PAYLOAD_CONSTANTS.MIN_VERSION,
      max: PAYLOAD_CONSTANTS.CURRENT_VERSION,
    });
  }

  if (typedPayload.v < PAYLOAD_CONSTANTS.MIN_VERSION) {
    throw new PayloadVersionError(typedPayload.v, {
      min: PAYLOAD_CONSTANTS.MIN_VERSION,
      max: PAYLOAD_CONSTANTS.CURRENT_VERSION,
    });
  }

  // Step 6: Check expiry
  const now = Math.floor(Date.now() / 1000);
  const isExpired =
    typedPayload.x !== undefined &&
    typedPayload.x < now - PAYLOAD_CONSTANTS.EXPIRY_TOLERANCE;

  if (isExpired && typedPayload.x) {
    throw new PayloadExpiredError(new Date(typedPayload.x * 1000));
  }

  // Step 7: Validate node count
  const nodeCount = countPayloadNodes(typedPayload.n);
  if (nodeCount > PAYLOAD_CONSTANTS.MAX_NODE_COUNT) {
    throw new PayloadDecodeError(
      `Too many nodes: ${nodeCount}`,
      'This link contains too many elements'
    );
  }

  // Build metadata
  const metadata: DecodeResult['metadata'] = {
    version: typedPayload.v,
    createdAt: new Date(typedPayload.c * 1000),
    updatedAt: new Date(typedPayload.u * 1000),
    expiresAt: typedPayload.x ? new Date(typedPayload.x * 1000) : undefined,
    isExpired: false, // Would have thrown above if expired
    tokenLength: token.length,
  };

  return {
    payloadNote: typedPayload,
    metadata,
  };
}

/**
 * Decode a URL token directly to a Note (convenience function)
 */
export function decodePayloadToNote(token: string): Note {
  const { payloadNote } = decodePayload(token);
  return payloadToNote(payloadNote);
}

/**
 * Check if a token is valid without fully decoding (for quick validation)
 */
export function isValidPayloadToken(token: string): boolean {
  try {
    // Quick format checks
    if (!token || token.length < 4) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;

    // Try to decode - this validates the entire chain
    decodePayload(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get payload metadata without full conversion to Note
 */
export function getPayloadMetadata(token: string): DecodeResult['metadata'] | null {
  try {
    const { metadata } = decodePayload(token);
    return metadata;
  } catch {
    return null;
  }
}

/**
 * Decode base64url string to Uint8Array (RFC 4648 Section 5)
 */
function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to regular base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }

  // Decode base64
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Get user-friendly error message for a decode error
 */
export function getDecodeErrorMessage(error: unknown): string {
  if (error instanceof PayloadExpiredError) {
    return 'This shared note has expired and is no longer available.';
  }

  if (error instanceof PayloadVersionError) {
    if (error.code === 'VERSION_TOO_NEW') {
      return 'This note was created with a newer version of Sandbooks. Please refresh the page to update.';
    }
    return 'This link format is no longer supported.';
  }

  if (error instanceof PayloadDecodeError) {
    return error.userMessage;
  }

  return 'Could not open this shared note. The link may be corrupted.';
}
