/**
 * Payload Links Module
 *
 * Self-contained share links that encode notes directly in URLs.
 * See docs/PAYLOAD_LINKS_SPEC.md for full specification.
 */

// Types
export type {
  PayloadNote,
  PayloadNode,
  PayloadInline,
  EncodeResult,
  DecodeResult,
  EncodeOptions,
} from '../../types/payload.types';

export {
  NodeType,
  InlineType,
  LanguageCode,
  ColorCode,
  PAYLOAD_CONSTANTS,
  PayloadError,
  PayloadEncodeError,
  PayloadDecodeError,
  PayloadTooLargeError,
  PayloadExpiredError,
  PayloadVersionError,
} from '../../types/payload.types';

// Mappers
export {
  noteToPayload,
  payloadToNote,
  nodeToPayload,
  payloadToNode,
  inlinesToPayload,
  payloadToInlines,
  countPayloadNodes,
  validatePayloadStructure,
} from './mappers';

// Encoder
export { encodePayload, estimateEncodedSize } from './encoder';

// Decoder
export {
  decodePayload,
  decodePayloadToNote,
  isValidPayloadToken,
  getPayloadMetadata,
  getDecodeErrorMessage,
} from './decoder';

// URL utilities
export {
  parsePayloadUrl,
  isCurrentUrlPayload,
  createPayloadUrl,
  createPayloadHash,
  getBaseUrl,
  clearPayloadFromUrl,
  setPayloadInUrl,
  hasUrlHash,
  getUrlHash,
} from './url';
export type { ParsedPayloadUrl, NotPayloadUrl, PayloadUrlResult } from './url';
