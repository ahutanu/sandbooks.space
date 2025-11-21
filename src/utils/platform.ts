/**
 * Platform Detection Utilities
 *
 * Detects user's operating system and provides platform-specific
 * keyboard modifier keys for display purposes.
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
  const modifiers = parts.slice(0, -1);

  // Check if the key matches
  const keyMatches = event.key.toLowerCase() === key.toLowerCase();

  // Check modifiers
  const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('mod');
  const hasMeta = modifiers.includes('meta') || modifiers.includes('mod');
  const hasAlt = modifiers.includes('alt');
  const hasShift = modifiers.includes('shift');

  const modifierMatches =
    (hasCtrl ? event.ctrlKey : !event.ctrlKey || hasMeta) &&
    (hasMeta ? event.metaKey : !event.metaKey || hasCtrl) &&
    (hasAlt ? event.altKey : !event.altKey) &&
    (hasShift ? event.shiftKey : !event.shiftKey);

  return keyMatches && modifierMatches;
};
