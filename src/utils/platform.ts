/**
 * Platform Detection Utilities
 *
 * Detects user's operating system and provides platform-specific
 * keyboard modifier keys for display purposes.
 * Also provides mobile detection and local execution support checks.
 */

/**
 * Detects if the user is on macOS
 */
export const isMac = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
};

/**
 * Returns the appropriate modifier key symbol for the current platform
 * @param key - The key type ('mod', 'alt', 'shift', 'ctrl')
 * @returns The symbol to display (⌘, ⌥, ⇧, or Ctrl)
 */
export const getModifierSymbol = (key: 'mod' | 'alt' | 'shift' | 'ctrl'): string => {
  const mac = isMac();

  switch (key) {
    case 'mod':
      return mac ? '⌘' : 'Ctrl';
    case 'alt':
      return mac ? '⌥' : 'Alt';
    case 'shift':
      return mac ? '⇧' : 'Shift';
    case 'ctrl':
      return mac ? '^' : 'Ctrl';
    default:
      return '';
  }
};

/**
 * Formats a keyboard shortcut for display
 * @param keys - Array of keys (e.g., ['mod', 'shift', 'k'])
 * @returns Formatted string (e.g., '⌘⇧K' on Mac, 'Ctrl+Shift+K' on Windows)
 */
export const formatShortcut = (keys: string[]): string => {
  const mac = isMac();

  return keys
    .map(key => {
      const lower = key.toLowerCase();
      if (lower === 'mod') return getModifierSymbol('mod');
      if (lower === 'alt') return getModifierSymbol('alt');
      if (lower === 'shift') return getModifierSymbol('shift');
      if (lower === 'ctrl') return getModifierSymbol('ctrl');
      if (lower === 'enter') return mac ? '↵' : 'Enter';
      if (lower === 'backspace') return mac ? '⌫' : 'Backspace';
      if (lower === 'delete') return mac ? '⌦' : 'Delete';
      if (lower === 'escape' || lower === 'esc') return mac ? '⎋' : 'Esc';
      if (lower === 'tab') return mac ? '⇥' : 'Tab';
      if (lower === 'space') return mac ? '␣' : 'Space';
      return key.toUpperCase();
    })
    .join(mac ? '' : '+');
};

/**
 * Checks if a keyboard event matches a given shortcut pattern
 * @param event - The keyboard event
 * @param pattern - Pattern like 'mod+shift+k' or 'ctrl+/'
 * @returns True if the event matches the pattern
 */
export const matchesShortcut = (event: KeyboardEvent, pattern: string): boolean => {
  const parts = pattern.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const rawModifiers = parts.slice(0, -1);
  const mac = isMac();

  // Resolve 'mod' to platform specific key
  const resolvedModifiers = rawModifiers.map(m =>
    m === 'mod' ? (mac ? 'meta' : 'ctrl') : m
  );

  // Check if the key matches
  // We check both event.key (for standard keys) and event.code (for physical keys, crucial for Mac Option+Key)
  const targetKey = key.toLowerCase();
  const keyMatches =
    event.key.toLowerCase() === targetKey ||
    event.code.toLowerCase() === `key${targetKey}`;

  // Check modifiers strictly
  // If 'ctrl' is in the pattern, event.ctrlKey must be true.
  // If 'ctrl' is NOT in the pattern, event.ctrlKey must be false.
  const hasCtrl = resolvedModifiers.includes('ctrl');
  const hasMeta = resolvedModifiers.includes('meta');
  const hasAlt = resolvedModifiers.includes('alt');
  const hasShift = resolvedModifiers.includes('shift');

  const modifierMatches =
    event.ctrlKey === hasCtrl &&
    event.metaKey === hasMeta &&
    event.altKey === hasAlt &&
    event.shiftKey === hasShift;

  return keyMatches && modifierMatches;
};

/**
 * Detects if the user is on a mobile device
 * Uses user agent detection only - width-based detection is unreliable
 * as desktop browsers can be resized to narrow widths
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Use user agent detection only - width-based detection is unreliable
  // as desktop browsers can be resized to narrow widths
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Checks if local execution is supported on the current platform
 * Returns false on mobile devices, true on desktop
 * Additional checks can be added for runtime availability, permissions, etc.
 */
export const isLocalExecutionSupported = async (): Promise<boolean> => {
  if (isMobile()) return false;
  // Additional checks: Node.js runtime, permissions, etc.
  // For now, assume desktop browsers can support local execution via backend
  return true;
};
