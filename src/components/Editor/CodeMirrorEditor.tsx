/**
 * CodeMirrorEditor Component
 *
 * A React wrapper around CodeMirror 6 with modern, minimal aesthetics.
 * Provides professional code editing capabilities with line numbers,
 * real-time syntax highlighting, bracket matching, and autocomplete.
 *
 * Features:
 * - Line numbers (seamless gutter)
 * - Real-time syntax highlighting (0ms perceived delay)
 * - Bracket matching (highlight matching pairs)
 * - Auto-indentation (2-space indent)
 * - Tab key handling (inserts 2 spaces)
 * - Comment toggling (Cmd+/)
 * - Modern theme (light/dark)
 *
 * Date: 2025-11-20
 */

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, dropCursor, rectangularSelection } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { indentWithTab, defaultKeymap } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { sandbooksTheme } from './codemirror/theme';
import { getLanguageExtension } from './codemirror/languages';
import type { Language } from '../../types';

interface CodeMirrorEditorProps {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  readonly?: boolean;
  className?: string;
}

export const CodeMirrorEditor = ({
  value,
  language,
  onChange,
  theme,
  readonly = false,
  className = '',
}: CodeMirrorEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);

  // Compartments for dynamic reconfiguration
  const languageCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());

  // Initialize CodeMirror editor on mount
  useEffect(() => {
    if (!editorRef.current || isInitializedRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        // Line numbers
        lineNumbers(),

        // Highlight active line
        highlightActiveLineGutter(),
        highlightActiveLine(),

        // Drop cursor for drag and drop
        dropCursor(),

        // Bracket matching
        bracketMatching(),

        // Close brackets automatically
        closeBrackets(),

        // Auto-indentation
        indentOnInput(),

        // Rectangular selection
        rectangularSelection(),

        // Highlight selection matches
        highlightSelectionMatches(),

        // Language support (dynamic)
        languageCompartment.current.of(getLanguageExtension(language)),

        // Modern theme (dynamic)
        themeCompartment.current.of(sandbooksTheme(theme)),

        // Readonly mode (dynamic)
        readOnlyCompartment.current.of(EditorView.editable.of(!readonly)),

        // Keyboard shortcuts
        keymap.of([
          indentWithTab, // Tab/Shift+Tab for indent/dedent
          ...closeBracketsKeymap,
          ...searchKeymap,
          ...defaultKeymap,
        ]),

        // Custom tab size (2 spaces, not 4)
        EditorState.tabSize.of(2),

        // Update parent component on change
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readonly) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),

        // Autocomplete configuration
        autocompletion({
          activateOnTyping: true,
          maxRenderedOptions: 8, // Keep minimal and focused
          closeOnBlur: true,
          selectOnOpen: true,
          defaultKeymap: true,
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - dynamic updates handled by separate useEffects below

  // Update content when value prop changes externally
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) return;

    const currentValue = viewRef.current.state.doc.toString();
    if (currentValue !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Update language when language prop changes
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) return;

    viewRef.current.dispatch({
      effects: languageCompartment.current.reconfigure(getLanguageExtension(language)),
    });
  }, [language]);

  // Update theme when theme prop changes
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) return;

    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(sandbooksTheme(theme)),
    });
  }, [theme]);

  // Update readonly mode when readonly prop changes
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) return;

    viewRef.current.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorView.editable.of(!readonly)),
    });
  }, [readonly]);

  return (
    <div
      ref={editorRef}
      className={`codemirror-wrapper ${className}`}
      style={{
        fontSize: '14px',
        lineHeight: '1.625',
        fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", "Monaco", "Consolas", monospace',
      }}
    />
  );
};
