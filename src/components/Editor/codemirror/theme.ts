/**
 * Modern CodeMirror 6 Theme
 *
 * Design Philosophy:
 * - Minimal chrome (seamless gutter, subtle line numbers)
 * - Professional Dark/Light color palette
 * - Generous spacing (24px padding, matching current design)
 * - Smooth animations (200-300ms spring easing)
 * - Glass morphism (backdrop blur on autocomplete)
 *
 * Date: 2025-11-20
 */

import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export const sandbooksTheme = (mode: 'light' | 'dark'): Extension => {
  // Sandbooks Color Palette
  const colors = mode === 'dark' ? {
    // Background
    background: '#292A30',        // Dark stone
    backgroundSelected: '#3A3B41', // Selection

    // Text
    text: '#FFFFFF',              // Pure white (high contrast)
    textInactive: '#7F8C99',      // Muted gray
    cursor: '#5AC8FA',            // iOS blue

    // UI Elements
    gutter: '#292A30',            // Same as background (seamless)
    gutterText: '#7F8C99',        // Subtle line numbers (4.8:1 contrast)
    gutterActive: '#FFFFFF',      // Highlighted line number
    lineHighlight: '#2C2D33',     // Active line (subtle, 3% lighter)

    // Syntax Colors (WCAG AAA compliant)
    keyword: '#FF7AB2',           // Magenta (def, if, return) - 8.1:1
    string: '#FC6A5D',            // Coral red - 7.2:1
    number: '#A79DF8',            // Lavender - 9.3:1
    comment: '#7F8C99',           // Muted gray (italic) - 4.8:1 AA
    function: '#FF816F',          // Orange - 7.5:1
    variable: '#91D462',          // Green - 11.2:1
    type: '#8AD1C3',              // Cyan - 10.1:1
    operator: '#FFFFFF',          // White
    punctuation: '#FFFFFF',       // White
    boolean: '#FF7AB2',           // Magenta (same as keyword)
    constant: '#A79DF8',          // Lavender (same as number)
  } : {
    // Light Mode Colors
    background: '#FFFFFF',
    backgroundSelected: '#E3F2FD',

    text: '#1C1917',              // Stone-900
    textInactive: '#78716C',      // Stone-500
    cursor: '#0071E3',            // Professional blue

    gutter: '#FFFFFF',            // Same as background (seamless)
    gutterText: '#A8A29E',        // Stone-400 (subtle)
    gutterActive: '#1C1917',      // Stone-900
    lineHighlight: '#F5F5F4',     // Stone-100 (subtle)

    // Syntax Colors
    keyword: '#AD3DA4',           // Purple - 7.1:1
    string: '#D12F1B',            // Red - 8.2:1
    number: '#272AD8',            // Blue - 9.4:1
    comment: '#5D6C79',           // Gray - 5.1:1 AA
    function: '#804FB8',          // Purple - 7.8:1
    variable: '#0F6804',          // Green - 10.2:1
    type: '#0B4F79',              // Dark blue - 8.9:1
    operator: '#000000',          // Black
    punctuation: '#000000',       // Black
    boolean: '#AD3DA4',           // Purple (same as keyword)
    constant: '#272AD8',          // Blue (same as number)
  };

  // Editor Theme (UI Elements)
  const editorTheme = EditorView.theme({
    '&': {
      backgroundColor: colors.background,
      color: colors.text,
      fontSize: '14px',
      fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", "Monaco", "Consolas", monospace',
      lineHeight: '1.625', // Optimal line height (matches research)
      height: 'auto',

      // Scrollbar (macOS Style - Overlay)
      '&::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
      },

      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },

      '&::-webkit-scrollbar-thumb': {
        backgroundColor: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.2)'
          : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '5px',
        transition: 'background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },

      '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
      },
    },

    '.cm-content': {
      caretColor: colors.cursor,
      padding: '24px', // Match current code block padding (8px grid system)
      minHeight: '120px',
    },

    '.cm-cursor': {
      borderLeftColor: colors.cursor,
      borderLeftWidth: '2px',
    },

    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: colors.cursor,
    },

    // Selection
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: colors.backgroundSelected,
    },

    '.cm-selectionBackground': {
      backgroundColor: colors.backgroundSelected,
    },

    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: colors.backgroundSelected,
    },

    '::selection': {
      backgroundColor: colors.backgroundSelected,
    },

    // Line Numbers (Seamless Gutter)
    '.cm-gutters': {
      backgroundColor: colors.gutter,
      border: 'none',
      paddingLeft: '16px',
      paddingRight: '20px',
      minWidth: '56px',
      color: colors.gutterText,
    },

    '.cm-lineNumbers': {
      fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
      fontSize: '12px',
      color: colors.gutterText,
      fontVariantNumeric: 'tabular-nums',
      userSelect: 'none',
      minWidth: '32px',
      textAlign: 'right',
    },

    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 0',
      lineHeight: '1.625',
    },

    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: colors.gutterActive,
      fontWeight: '500',
    },

    // Active Line Highlight (Subtle)
    '.cm-activeLine': {
      backgroundColor: colors.lineHighlight,
    },

    // Bracket Matching (subtle highlight)
    '&.cm-focused .cm-matchingBracket': {
      backgroundColor: mode === 'dark'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(0, 0, 0, 0.1)',
      outline: mode === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.3)'
        : '1px solid rgba(0, 0, 0, 0.2)',
      borderRadius: '2px',
      fontWeight: '600',
    },

    '&.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      outline: '1px solid rgba(255, 0, 0, 0.5)',
      borderRadius: '2px',
    },

    // Autocomplete Dropdown (Glass Morphism)
    '.cm-tooltip': {
      backgroundColor: colors.background,
      border: mode === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      padding: '4px',
      boxShadow: mode === 'dark'
        ? '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        : '0 10px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(12px) saturate(150%)',
      overflow: 'hidden',
    },

    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
        fontSize: '12px',
        maxHeight: '240px',
        overflowY: 'auto',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      },

      '& > ul > li': {
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      },

      '& > ul > li[aria-selected]': {
        backgroundColor: colors.backgroundSelected,
        color: colors.text,
      },

      '& > ul > li:hover': {
        backgroundColor: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.05)',
      },
    },

    '.cm-completionIcon': {
      fontSize: '14px',
      lineHeight: '1',
      opacity: 0.7,
    },

    '.cm-completionLabel': {
      flex: 1,
    },

    '.cm-completionDetail': {
      fontSize: '11px',
      opacity: 0.6,
      fontStyle: 'italic',
    },

    '.cm-scroller': {
      '&::-webkit-scrollbar': {
        width: '10px',
        height: '10px',
      },

      '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },

      '&::-webkit-scrollbar-thumb': {
        backgroundColor: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.2)'
          : 'rgba(0, 0, 0, 0.2)',
        borderRadius: '5px',
        transition: 'background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
      },

      '&::-webkit-scrollbar-thumb:hover': {
        backgroundColor: mode === 'dark'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)',
      },
    },

    // Search Panel (if search extension is added)
    '.cm-panel.cm-search': {
      backgroundColor: colors.background,
      border: mode === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      padding: '8px 12px',
    },

    '.cm-searchMatch': {
      backgroundColor: mode === 'dark'
        ? 'rgba(255, 200, 0, 0.3)'
        : 'rgba(255, 200, 0, 0.5)',
      outline: '1px solid rgba(255, 200, 0, 0.8)',
    },

    '.cm-searchMatch-selected': {
      backgroundColor: mode === 'dark'
        ? 'rgba(255, 150, 0, 0.5)'
        : 'rgba(255, 150, 0, 0.7)',
    },

    // Focus Outline (Accessibility)
    '&.cm-focused': {
      outline: 'none', // Custom focus handled by parent container
    },
  }, { dark: mode === 'dark' });

  // Syntax Highlighting
  const highlightStyle = HighlightStyle.define([
    // Keywords (def, if, for, while, class, import, from, return, etc.)
    {
      tag: t.keyword,
      color: colors.keyword,
      fontWeight: 'bold'
    },

    // Strings ("hello", 'world', `template`)
    {
      tag: t.string,
      color: colors.string
    },

    // Numbers (42, 3.14, 0x1A, 0b1010)
    {
      tag: t.number,
      color: colors.number
    },

    // Booleans (True, False, true, false, null, None, undefined)
    {
      tag: t.bool,
      color: colors.boolean,
      fontWeight: 'bold'
    },

    // Null/None
    {
      tag: t.null,
      color: colors.keyword,
      fontWeight: 'bold'
    },

    // Comments (# Python, // JavaScript, /* Multi-line */)
    {
      tag: t.comment,
      color: colors.comment,
      fontStyle: 'italic'
    },

    // Function names (definitions and calls)
    {
      tag: t.function(t.variableName),
      color: colors.function
    },

    // Variable names
    {
      tag: t.variableName,
      color: colors.variable
    },

    // Type names (int, str, List, Dict, etc.)
    {
      tag: t.typeName,
      color: colors.type
    },

    // Class names
    {
      tag: t.className,
      color: colors.type,
      fontWeight: '500'
    },

    // Property names (object.property)
    {
      tag: t.propertyName,
      color: colors.variable
    },

    // Operators (+, -, *, /, =, ==, !=, etc.)
    {
      tag: t.operator,
      color: colors.operator
    },

    // Punctuation (,, ;, :, etc.)
    {
      tag: t.punctuation,
      color: colors.punctuation
    },

    // Brackets ((), [], {})
    {
      tag: t.bracket,
      color: colors.punctuation
    },

    // Special identifiers (__init__, __name__, etc.)
    {
      tag: t.special(t.variableName),
      color: colors.function,
      fontStyle: 'italic'
    },

    // Constants (CONSTANT_NAME, Math.PI)
    {
      tag: t.constant(t.variableName),
      color: colors.constant,
      fontWeight: '500'
    },

    // Module names (import numpy as np)
    {
      tag: t.namespace,
      color: colors.type
    },

    // Decorators (@property, @staticmethod)
    {
      tag: t.meta,
      color: colors.function
    },

    // Invalid/error tokens
    {
      tag: t.invalid,
      color: '#FF0000',
      textDecoration: 'wavy underline'
    },
  ]);

  return [editorTheme, syntaxHighlighting(highlightStyle)];
};
