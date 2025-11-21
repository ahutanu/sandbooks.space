/**
 * CodeMirrorBlock Component
 *
 * Standalone code editor using @uiw/react-codemirror
 * Completely separate from TipTap - no integration complexity
 *
 * Features:
 * - Line numbers
 * - Real-time syntax highlighting
 * - Bracket matching and auto-closing
 * - Cloud execution via Hopx
 * - Modern, minimal UI
 *
 * Date: 2025-11-20
 */

import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { go } from '@codemirror/legacy-modes/mode/go';
import { useNotesStore } from '../../store/notesStore';
import type { Language, CodeBlock as CodeBlockType } from '../../types';
import { LanguageIcon } from '../Editor/LanguageIcon';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { VscClearAll } from 'react-icons/vsc';

interface CodeMirrorBlockProps {
  noteId: string;
  block: CodeBlockType;
}

export const CodeMirrorBlock = ({ noteId, block }: CodeMirrorBlockProps) => {
  const {
    updateCodeBlock,
    deleteCodeBlock,
    executeCodeBlock,
    darkModeEnabled,
    cloudExecutionEnabled
  } = useNotesStore();

  const [isExecuting, setIsExecuting] = useState(false);

  // Get CodeMirror extensions for the selected language
  const getExtensions = (lang: Language) => {
    switch (lang) {
      case 'python':
        return [python()];
      case 'javascript':
        return [javascript({ jsx: false })];
      case 'typescript':
        return [javascript({ typescript: true, jsx: false })];
      case 'bash':
        return [StreamLanguage.define(shell)];
      case 'go':
        return [StreamLanguage.define(go)];
      default:
        return [];
    }
  };

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    updateCodeBlock(noteId, block.id, { code: newCode });
  };

  // Handle language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCodeBlock(noteId, block.id, { language: e.target.value as Language });
  };

  // Execute code via Hopx
  const handleExecute = async () => {
    if (!cloudExecutionEnabled) {
      toast.error('Enable cloud execution to run code');
      return;
    }

    if (!block.code.trim()) {
      toast.error('Please add some code to run');
      return;
    }

    setIsExecuting(true);

    // Silent execution - backend handles retries automatically
    // No loading toast - just show spinner in button
    try {
      await executeCodeBlock(noteId, block.id);
      // Success is silent - output appears below (minimal UX)
    } catch {
      // Only show error if backend exhausted all retries
      // Error will be displayed in output section (no toast)
    } finally {
      setIsExecuting(false);
    }
  };

  // Clear output
  const handleClearOutput = () => {
    updateCodeBlock(noteId, block.id, { output: undefined });
  };

  // Delete code block
  const handleDelete = () => {
    deleteCodeBlock(noteId, block.id);
  };

  return (
    <div className="code-mirror-block not-prose my-8 max-w-4xl mx-auto">
      <div className="border-2 border-stone-300 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-800 transition-transform duration-300 hover:scale-[1.01] hover:-translate-y-1 shadow-code-block">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900 dark:from-stone-800 dark:via-stone-900 dark:to-black border-b border-stone-600/40 dark:border-stone-700/50">
          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <LanguageIcon language={block.language} size={20} className="text-emerald-400 flex-shrink-0" />
              <select
                value={block.language}
                onChange={handleLanguageChange}
                className="appearance-none bg-transparent text-stone-100 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded pr-6 py-1 cursor-pointer hover:text-emerald-400 transition-colors duration-200"
                aria-label="Select programming language"
                title={`Language: ${block.language}`}
              >
                <option value="python" className="bg-stone-800 text-stone-100">python</option>
                <option value="javascript" className="bg-stone-800 text-stone-100">javascript</option>
                <option value="typescript" className="bg-stone-800 text-stone-100">typescript</option>
                <option value="bash" className="bg-stone-800 text-stone-100">bash</option>
                <option value="go" className="bg-stone-800 text-stone-100">go</option>
              </select>
              <svg className="w-3 h-3 text-stone-400 absolute right-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {block.output && cloudExecutionEnabled && (
              <button
                onClick={handleClearOutput}
                className="p-2 bg-stone-600/50 hover:bg-stone-500 text-stone-100 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[0.95]"
                aria-label="Clear output"
                title="Clear output"
              >
                <VscClearAll size={18} aria-hidden="true" />
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-2 bg-red-600/50 hover:bg-red-600 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.95]"
              aria-label="Delete code block"
              title="Delete code block"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {cloudExecutionEnabled && (
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={clsx(
                  'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.95]',
                  isExecuting
                    ? 'bg-stone-600/50 cursor-not-allowed text-stone-400 animate-pulseGlow'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-400 focus-visible:ring-offset-stone-800 shadow-emerald-500/30 shadow-lg hover:shadow-emerald-500/50 hover:shadow-xl'
                )}
                aria-label={isExecuting ? 'Code is executing' : 'Run code'}
                aria-busy={isExecuting}
                title={isExecuting ? 'Running...' : 'Run code'}
              >
                {isExecuting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* CodeMirror Editor */}
        <CodeMirror
          value={block.code}
          height="auto"
          minHeight="120px"
          maxHeight="600px"
          theme={darkModeEnabled ? 'dark' : 'light'}
          extensions={getExtensions(block.language)}
          onChange={handleCodeChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
          }}
          style={{
            fontSize: '14px',
            lineHeight: '1.625',
            fontFamily: '"JetBrains Mono", "SF Mono", "Menlo", "Monaco", "Consolas", monospace',
          }}
        />

        {/* Output Display */}
        {block.output && (
          <div className="border-t border-stone-200 dark:border-stone-700 animate-fadeInSlideUp">
            {/* Stdout */}
            {block.output.stdout && (
              <div className="px-5 py-4 bg-white dark:bg-stone-800 border-b border-stone-100 dark:border-stone-700">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Output
                </div>
                <pre className="text-base font-mono text-stone-800 dark:text-stone-200 whitespace-pre-wrap bg-stone-50 dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-700 max-h-[400px] overflow-y-auto">
                  {block.output.stdout}
                </pre>
              </div>
            )}

            {/* Stderr */}
            {block.output.stderr && (
              <div className="px-5 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                  </svg>
                  Error Output
                </div>
                <pre className="text-base font-mono text-red-800 dark:text-red-300 whitespace-pre-wrap bg-white dark:bg-stone-900 p-4 rounded-lg border border-red-200 dark:border-red-900/30 max-h-[300px] overflow-y-auto">
                  {block.output.stderr}
                </pre>
              </div>
            )}

            {/* Error */}
            {block.output.error && (
              <div className="px-5 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Error
                </div>
                <pre className="text-base font-mono text-red-800 dark:text-red-300 whitespace-pre-wrap bg-white dark:bg-stone-900 p-4 rounded-lg border border-red-200 dark:border-red-900/30 max-h-[300px] overflow-y-auto">
                  {block.output.error}
                </pre>
              </div>
            )}

            {/* Execution Time */}
            {block.output.executionTime !== undefined && (
              <div className="px-5 py-3 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Executed in {block.output.executionTime}ms
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
