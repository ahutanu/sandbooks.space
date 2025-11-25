/**
 * Payload Links Type Definitions
 *
 * Types for encoding notes as self-contained URL tokens.
 * See docs/PAYLOAD_LINKS_SPEC.md for full specification.
 */

// Node type enum for compact encoding (single byte)
export enum NodeType {
  Paragraph = 0,
  Heading = 1,
  CodeBlock = 2, // ExecutableCodeBlock
  BulletList = 3,
  OrderedList = 4,
  ListItem = 5,
  TaskList = 6,
  TaskItem = 7,
  Blockquote = 8,
  HorizontalRule = 9,
  HardBreak = 10,
}

// Inline type enum for compact encoding (single byte)
export enum InlineType {
  Bold = 0,
  Italic = 1,
  Strike = 2,
  Code = 3,
  Link = 4,
  Highlight = 5,
}

// Language enum for compact encoding (single byte)
export enum LanguageCode {
  Python = 0,
  JavaScript = 1,
  TypeScript = 2,
  Bash = 3,
  Go = 4,
}

// Color code enum for tags (single byte)
export enum ColorCode {
  Gray = 0,
  Red = 1,
  Orange = 2,
  Amber = 3,
  Yellow = 4,
  Green = 5,
  Emerald = 6,
  Blue = 7,
  Indigo = 8,
  Purple = 9,
  Pink = 10,
  Rose = 11,
}

// Map language strings to codes
export const LANGUAGE_TO_CODE: Record<string, LanguageCode> = {
  python: LanguageCode.Python,
  javascript: LanguageCode.JavaScript,
  typescript: LanguageCode.TypeScript,
  bash: LanguageCode.Bash,
  go: LanguageCode.Go,
};

// Map codes back to language strings
export const CODE_TO_LANGUAGE: Record<LanguageCode, string> = {
  [LanguageCode.Python]: 'python',
  [LanguageCode.JavaScript]: 'javascript',
  [LanguageCode.TypeScript]: 'typescript',
  [LanguageCode.Bash]: 'bash',
  [LanguageCode.Go]: 'go',
};

// Map color strings to codes
export const COLOR_TO_CODE: Record<string, ColorCode> = {
  gray: ColorCode.Gray,
  red: ColorCode.Red,
  orange: ColorCode.Orange,
  amber: ColorCode.Amber,
  yellow: ColorCode.Yellow,
  green: ColorCode.Green,
  emerald: ColorCode.Emerald,
  blue: ColorCode.Blue,
  indigo: ColorCode.Indigo,
  purple: ColorCode.Purple,
  pink: ColorCode.Pink,
  rose: ColorCode.Rose,
};

// Map codes back to color strings
export const CODE_TO_COLOR: Record<ColorCode, string> = {
  [ColorCode.Gray]: 'gray',
  [ColorCode.Red]: 'red',
  [ColorCode.Orange]: 'orange',
  [ColorCode.Amber]: 'amber',
  [ColorCode.Yellow]: 'yellow',
  [ColorCode.Green]: 'green',
  [ColorCode.Emerald]: 'emerald',
  [ColorCode.Blue]: 'blue',
  [ColorCode.Indigo]: 'indigo',
  [ColorCode.Purple]: 'purple',
  [ColorCode.Pink]: 'pink',
  [ColorCode.Rose]: 'rose',
};

/**
 * Compact payload note model.
 * Uses short field names for minimal serialization size.
 */
export interface PayloadNote {
  /** Version marker for future compatibility */
  v: 1;
  /** Note title (omit if "Untitled Note" or extractable from content) */
  t?: string;
  /** Created timestamp (Unix seconds) */
  c: number;
  /** Updated timestamp (Unix seconds) */
  u: number;
  /** Tags as compact array: [name, colorCode][] */
  g?: [string, number][];
  /** Content as minimal node tree */
  n: PayloadNode[];
  /** Optional expiry timestamp (Unix seconds) */
  x?: number;
}

/**
 * Compact node representation using tuples.
 * First element is always NodeType enum.
 */
export type PayloadNode =
  | [NodeType.Paragraph, PayloadInline[]]
  | [NodeType.Heading, number, PayloadInline[]] // level, content
  | [NodeType.CodeBlock, number, string] // languageCode, code
  | [NodeType.BulletList, PayloadNode[]]
  | [NodeType.OrderedList, number, PayloadNode[]] // start, items
  | [NodeType.ListItem, PayloadNode[]]
  | [NodeType.TaskList, PayloadNode[]]
  | [NodeType.TaskItem, boolean, PayloadNode[]] // checked, content
  | [NodeType.Blockquote, PayloadNode[]]
  | [NodeType.HorizontalRule]
  | [NodeType.HardBreak];

/**
 * Compact inline content representation.
 * Plain strings for text, tuples for formatted content.
 */
export type PayloadInline =
  | string // plain text
  | [InlineType.Bold, PayloadInline[]]
  | [InlineType.Italic, PayloadInline[]]
  | [InlineType.Strike, PayloadInline[]]
  | [InlineType.Code, string]
  | [InlineType.Link, string, PayloadInline[]] // href, content
  | [InlineType.Highlight, PayloadInline[]];

/**
 * Encoding result with statistics
 */
export interface EncodeResult {
  token: string;
  stats: {
    originalSize: number;
    compressedSize: number;
    tokenLength: number;
    nodeCount: number;
  };
}

/**
 * Decoding result with metadata
 */
export interface DecodeResult {
  payloadNote: PayloadNote;
  metadata: {
    version: number;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    isExpired: boolean;
    tokenLength: number;
  };
}

/**
 * Encode options
 */
export interface EncodeOptions {
  /** Expiry duration in seconds (optional) */
  expiresIn?: number;
}

// Payload link constants
export const PAYLOAD_CONSTANTS = {
  /** Current payload version */
  CURRENT_VERSION: 1 as const,
  /** Minimum supported version */
  MIN_VERSION: 1 as const,
  /** Magic byte for payload identification */
  MAGIC_BYTE: 0x53, // 'S' for Sandbooks
  /** Maximum token length in characters (8KB safe for all browsers/servers) */
  MAX_TOKEN_LENGTH: 8000,
  /** Maximum decompressed size in bytes */
  MAX_DECOMPRESSED_SIZE: 10 * 1024 * 1024, // 10MB
  /** Maximum node count */
  MAX_NODE_COUNT: 1000,
  /** Clock drift tolerance for expiry (seconds) */
  EXPIRY_TOLERANCE: 300, // 5 minutes
  /** URL route prefix for payload links */
  URL_PREFIX: '#/p/',
};

// Error types
export class PayloadError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PayloadError';
  }
}

export class PayloadEncodeError extends PayloadError {
  constructor(message: string) {
    super(message, 'ENCODE_ERROR');
    this.name = 'PayloadEncodeError';
  }
}

export class PayloadDecodeError extends PayloadError {
  constructor(
    message: string,
    public readonly userMessage: string
  ) {
    super(message, 'DECODE_ERROR');
    this.name = 'PayloadDecodeError';
  }
}

export class PayloadTooLargeError extends PayloadError {
  constructor(
    public readonly estimatedSize: number,
    public readonly maxAllowed: number
  ) {
    super(
      `Payload too large: ${estimatedSize} chars exceeds ${maxAllowed} char limit`,
      'TOO_LARGE'
    );
    this.name = 'PayloadTooLargeError';
  }

  get suggestions(): string[] {
    return [
      'Remove some code blocks',
      'Split into multiple smaller notes',
      'Export as .ipynb file instead',
    ];
  }
}

export class PayloadExpiredError extends PayloadError {
  constructor(public readonly expiredAt: Date) {
    super(`Payload expired at ${expiredAt.toISOString()}`, 'EXPIRED');
    this.name = 'PayloadExpiredError';
  }
}

export class PayloadVersionError extends PayloadError {
  constructor(
    public readonly payloadVersion: number,
    public readonly supportedVersions: { min: number; max: number }
  ) {
    super(
      `Unsupported payload version: ${payloadVersion}`,
      payloadVersion > supportedVersions.max ? 'VERSION_TOO_NEW' : 'VERSION_TOO_OLD'
    );
    this.name = 'PayloadVersionError';
  }
}
