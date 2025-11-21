/**
 * Helper to generate timestamps for documentation
 */
export function generateTimestamps(offsetMs: number = 0) {
  const now = Date.now();
  return {
    tagTimestamp: now - offsetMs, // number for Tag
    noteTimestamp: new Date(now - offsetMs).toISOString(), // string for Note
    codeTimestamp: now - offsetMs, // number for CodeBlock
  };
}
