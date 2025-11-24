/**
 * CodeMirrorBlock Component - VS Code Style
 *
 * Embedded IDE experience using @uiw/react-codemirror
 * Mimics VS Code's visual design with tab bar, editor, and integrated terminal
 *
 * Features:
 * - Tab bar header (VS Code style)
 * - Dark+ theme approximation
 * - Integrated terminal output
 * - Status bar with execution info
 *
 * Date: 2025-11-21
 */

import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { go } from '@codemirror/legacy-modes/mode/go';
import { useNotesStore } from '../../store/notesStore';
import type { Language, CodeBlock as CodeBlockType } from '../../types';
import { LanguageIcon } from '../Editor/LanguageIcon';
import clsx from 'clsx';
import { showToast as toast } from '../../utils/toast';

interface CodeMirrorBlockProps {
  noteId: string;
  block: CodeBlockType;
}

export const CodeMirrorBlock = ({ noteId, block }: CodeMirrorBlockProps) => {
  const {
    updateCodeBlock,
    deleteCodeBlock,
    executeCodeBlock
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

  // Execute code via execution provider
  const handleExecute = async () => {
    if (!block.code.trim()) {
      toast.error('Please add some code to run');
      return;
    }

    setIsExecuting(true);

    try {
      await executeCodeBlock(noteId, block.id);
    } catch {
      // Error will be displayed in output section
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
      <div className="rounded-md overflow-hidden shadow-2xl border border-[#3c3c3c] overflow-x-auto" style={{ backgroundColor: '#1e1e1e' }}>
        {/* Tab Bar Header (VS Code style) */}
        <div className="flex items-center justify-between h-9 border-b border-[#2d2d2d]" style={{ backgroundColor: '#252526' }}>
          {/* Tab */}
          <div className="flex items-center h-full">
            <div
              className="flex items-center gap-2 h-full px-4 border-r border-[#2d2d2d] relative"
              style={{ backgroundColor: '#1e1e1e' }}
            >
              {/* Active tab indicator */}
              <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: '#007acc' }}></div>

              <LanguageIcon language={block.language} size={16} className="text-[#4ec9b0] flex-shrink-0" />
              <select
                value={block.language}
                onChange={handleLanguageChange}
                className="appearance-none bg-transparent text-[#cccccc] text-xs font-normal focus:outline-none pr-4 cursor-pointer hover:text-white transition-colors"
                aria-label="Select programming language"
                title={`Language: ${block.language}`}
                style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                <option value="python" className="bg-[#252526] text-[#cccccc]">Python</option>
                <option value="javascript" className="bg-[#252526] text-[#cccccc]">JavaScript</option>
                <option value="typescript" className="bg-[#252526] text-[#cccccc]">TypeScript</option>
                <option value="bash" className="bg-[#252526] text-[#cccccc]">Bash</option>
                <option value="go" className="bg-[#252526] text-[#cccccc]">Go</option>
              </select>
              <svg className="w-2.5 h-2.5 text-[#858585] absolute right-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 h-full pr-2">
            {block.output && (
              <button
                onClick={handleClearOutput}
                className="p-1.5 hover:bg-[#2a2d2e] rounded text-[#858585] hover:text-[#cccccc] transition-colors"
                aria-label="Clear output"
                title="Clear output"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-[#2a2d2e] rounded text-[#858585] hover:text-[#cccccc] transition-colors"
              aria-label="Delete code block"
              title="Delete code block"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className={clsx(
                'ml-1 p-1.5 rounded transition-colors',
                isExecuting
                  ? 'cursor-not-allowed text-[#858585]'
                  : 'hover:bg-[#0e639c] text-[#cccccc] hover:text-white'
              )}
              style={{ backgroundColor: isExecuting ? '#2a2d2e' : '#007acc' }}
              aria-label={isExecuting ? 'Code is executing' : 'Run code'}
              aria-busy={isExecuting}
              title={isExecuting ? 'Running...' : 'Run code'}
            >
              {isExecuting ? (
                <div className="w-3.5 h-3.5 border-2 border-[#858585] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
          </div>
        </div>

        {/* CodeMirror Editor */}
        <div style={{ backgroundColor: '#1e1e1e' }}>
          <CodeMirror
            value={block.code}
            height="auto"
            minHeight="120px"
            maxHeight="600px"
            theme={vscodeDark}
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
              lineHeight: '1.6',
              fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace',
            }}
          />
        </div>

        {/* Output Display (Terminal style) */}
        {block.output && (
          <div className="border-t border-[#2d2d2d]" style={{ backgroundColor: '#1e1e1e' }}>
            {/* Output Header */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#2d2d2d]" style={{ backgroundColor: '#252526' }}>
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#858585]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-[#cccccc]" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>OUTPUT</span>
              </div>
            </div>

            {/* Stdout */}
            {block.output.stdout && (
              <div className="px-4 py-3" style={{ backgroundColor: '#1e1e1e' }}>
                <pre className="text-sm font-mono text-[#cccccc] whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ fontFamily: '"JetBrains Mono", "Consolas", monospace' }}>
                  {block.output.stdout}
                </pre>
              </div>
            )}

            {/* Stderr */}
            {block.output.stderr && (
              <div className="px-4 py-3 border-t border-[#2d2d2d]" style={{ backgroundColor: '#1e1e1e' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-[#f48771]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-[#f48771]" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>ERROR</span>
                </div>
                <pre className="text-sm font-mono text-[#f48771] whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ fontFamily: '"JetBrains Mono", "Consolas", monospace' }}>
                  {block.output.stderr}
                </pre>
              </div>
            )}

            {/* Error */}
            {block.output.error && (
              <div className="px-4 py-3 border-t border-[#2d2d2d]" style={{ backgroundColor: '#1e1e1e' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-[#f48771]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-[#f48771]" style={{ fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>EXECUTION ERROR</span>
                </div>
                <pre className="text-sm font-mono text-[#f48771] whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ fontFamily: '"JetBrains Mono", "Consolas", monospace' }}>
                  {block.output.error}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Status Bar (VS Code style) */}
        <div className="flex items-center justify-between px-4 py-1 text-xs border-t border-[#2d2d2d]" style={{ backgroundColor: '#007acc', color: 'white', fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div className="flex items-center gap-4">
            <span className="font-medium">{block.language.toUpperCase()}</span>
            {block.output?.executionTime !== undefined && (
              <span className="opacity-90">Executed in {block.output.executionTime}ms</span>
            )}
          </div>
          <div>
            {isExecuting ? 'Executing...' : 'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
};
