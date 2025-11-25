/**
 * Payload Encoder
 *
 * Encodes a Note into a compact URL token using:
 * 1. Note → PayloadNote mapping (strip execution results)
 * 2. MessagePack serialization (compact binary)
 * 3. DEFLATE compression (pako)
 * 4. Base64url encoding (URL-safe)
 */

import { encode as msgpackEncode } from '@msgpack/msgpack';
import pako from 'pako';
import type { Note } from '../../types';
import {
  type EncodeResult,
  type EncodeOptions,
  PAYLOAD_CONSTANTS,
  PayloadEncodeError,
  PayloadTooLargeError,
} from '../../types/payload.types';
import { noteToPayload, countPayloadNodes } from './mappers';

/**
 * Encode a Note into a URL-safe token
 */
export function encodePayload(note: Note, options: EncodeOptions = {}): EncodeResult {
  // Validate input
  if (!note) {
    throw new PayloadEncodeError('No note provided');
  }

  if (!note.content?.content?.length) {
    throw new PayloadEncodeError('Cannot share an empty note');
  }

  // Calculate expiry timestamp if duration provided
  const expiresAt = options.expiresIn
    ? Math.floor(Date.now() / 1000) + options.expiresIn
    : undefined;

  // Step 1: Convert note to payload model
  const payload = noteToPayload(note, expiresAt);

  // Validate node count
  const nodeCount = countPayloadNodes(payload.n);
  if (nodeCount > PAYLOAD_CONSTANTS.MAX_NODE_COUNT) {
    throw new PayloadEncodeError(
      `Note has too many elements (${nodeCount}). Maximum allowed: ${PAYLOAD_CONSTANTS.MAX_NODE_COUNT}`
    );
  }

  // Step 2: Serialize with MessagePack
  const originalSize = JSON.stringify(payload).length;
  const msgpackData = msgpackEncode(payload);

  // Step 3: Compress with DEFLATE (level 9 for max compression)
  const compressed = pako.deflate(msgpackData, { level: 9 });
  const compressedSize = compressed.length;

  // Step 4: Encode as base64url
  const token = base64urlEncode(compressed);
  const tokenLength = token.length;

  // Check size limit
  if (tokenLength > PAYLOAD_CONSTANTS.MAX_TOKEN_LENGTH) {
    throw new PayloadTooLargeError(tokenLength, PAYLOAD_CONSTANTS.MAX_TOKEN_LENGTH);
  }

  return {
    token,
    stats: {
      originalSize,
      compressedSize,
      tokenLength,
      nodeCount,
    },
  };
}

/**
 * Encode Uint8Array to base64url string (RFC 4648 Section 5)
 * No padding, URL-safe characters only: A-Z a-z 0-9 - _
 */
function base64urlEncode(data: Uint8Array): string {
  // Convert to regular base64
  let base64 = '';
  const bytes = new Uint8Array(data);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }

  base64 = btoa(base64);

  // Convert to base64url: replace + with -, / with _, remove padding =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Estimate the encoded size without full encoding (for UI feedback)
 */
export function estimateEncodedSize(note: Note): {
  estimated: number;
  wouldFit: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  try {
    // Quick JSON size check
    const jsonSize = JSON.stringify(note.content).length;

    // Rough estimates based on typical compression ratios:
    // - JSON to MessagePack: ~0.7x
    // - MessagePack to DEFLATE: ~0.4x for text
    // - Binary to base64url: ~1.33x
    const estimatedCompressed = jsonSize * 0.7 * 0.4;
    const estimatedToken = Math.ceil(estimatedCompressed * 1.33);

    return {
      estimated: estimatedToken,
      wouldFit: estimatedToken <= PAYLOAD_CONSTANTS.MAX_TOKEN_LENGTH,
      confidence: jsonSize < 1000 ? 'high' : jsonSize < 5000 ? 'medium' : 'low',
    };
  } catch {
    return {
      estimated: Infinity,
      wouldFit: false,
      confidence: 'low',
    };
  }
}
