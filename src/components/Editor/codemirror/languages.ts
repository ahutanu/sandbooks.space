/**
 * Language Extensions for CodeMirror 6
 *
 * Provides syntax highlighting and language-specific features
 * for all supported languages in Sandbooks.
 *
 * Supported Languages:
 * - Python
 * - JavaScript
 * - TypeScript
 * - Bash
 * - Go
 *
 * Date: 2025-11-20
 */

import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { go } from '@codemirror/legacy-modes/mode/go';
import type { LanguageSupport } from '@codemirror/language';
import type { Language } from '../../../types';

/**
 * Get the appropriate CodeMirror language extension for the given language
 *
 * @param language - The language identifier (python, javascript, typescript, bash, go)
 * @returns CodeMirror language extension with syntax highlighting
 */
export const getLanguageExtension = (language: Language): LanguageSupport | StreamLanguage<unknown> => {
  switch (language) {
    case 'python':
      return python();

    case 'javascript':
      return javascript({
        jsx: false,        // No JSX support (code blocks are pure JS)
        typescript: false, // TypeScript handled separately
      });

    case 'typescript':
      return javascript({
        jsx: false,        // No JSX support
        typescript: true,  // Enable TypeScript syntax
      });

    case 'bash':
      // Use legacy mode for Bash (no official @codemirror/lang-bash yet)
      return StreamLanguage.define(shell);

    case 'go':
      // Use legacy mode for Go (no official @codemirror/lang-go yet)
      return StreamLanguage.define(go);

    default:
      // Fallback to Python if language is unknown
      console.warn(`Unknown language: ${language}, falling back to Python`);
      return python();
  }
};

/**
 * Get human-readable language name for display
 *
 * @param language - The language identifier
 * @returns Human-readable name
 */
export const getLanguageName = (language: Language): string => {
  switch (language) {
    case 'python':
      return 'Python';
    case 'javascript':
      return 'JavaScript';
    case 'typescript':
      return 'TypeScript';
    case 'bash':
      return 'Bash';
    case 'go':
      return 'Go';
    default:
      return 'Unknown';
  }
};

/**
 * Get file extension for the given language
 *
 * @param language - The language identifier
 * @returns File extension (without dot)
 */
export const getFileExtension = (language: Language): string => {
  switch (language) {
    case 'python':
      return 'py';
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'bash':
      return 'sh';
    case 'go':
      return 'go';
    default:
      return 'txt';
  }
};
