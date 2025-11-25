import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import type { Language, ExecutionResult } from '../../types';
import { useNotesStore } from '../../store/notesStore';
import { showToast as toast } from '../../utils/toast';
import { executionModeManager } from '../../services/execution/executionModeManager';
import { VscClearAll } from 'react-icons/vsc';
import { Button } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { LanguageIcon } from './LanguageIcon';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { recordOnboardingEvent } from '../../utils/onboardingMetrics';
import { NotebookOutput } from '../Notebook/NotebookOutput';
import { executeCell } from '../../services/notebook';
import type { JupyterOutput } from '../../types/notebook';

// Format elapsed time with appropriate units
const formatElapsedTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const LANGUAGES: Language[] = ['python', 'javascript', 'typescript', 'bash', 'go'];

export const ExecutableCodeBlockComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const { sandboxStatus, recreateSandbox, setSandboxStatus, darkModeEnabled } = useNotesStore();
  const autoHealSandbox = useNotesStore((state) => state.autoHealSandbox);
  const activeNoteId = useNotesStore((state) => state.activeNoteId);
  const [isExecuting, setIsExecuting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const language = (node.attrs.language as Language) || 'python';

  // Live elapsed time counter during execution
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isExecuting) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
      intervalId = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Date.now() - startTimeRef.current);
        }
      }, 100);
    } else {
      startTimeRef.current = null;
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isExecuting]);
  const executionResult = node.attrs.executionResult as ExecutionResult | undefined;
  const executionCount = node.attrs.executionCount as number | undefined;
  const jupyterOutputs = node.attrs.jupyterOutputs as JupyterOutput[] | undefined;

  // Backward compatibility: Try attrs.code first, fallback to textContent
  const code = (node.attrs.code as string) || node.textContent || '';

  // Handle code changes from CodeMirror
  const handleCodeChange = (newCode: string) => {
    // Update code attribute (clean pattern for atom nodes)
    updateAttributes({ code: newCode });
  };

  const handleExecute = async () => {
    if (!code.trim()) {
      toast.error('Please add some code to run');
      return;
    }

    if (!activeNoteId) {
      toast.error('No active note');
      return;
    }

    setIsExecuting(true);
    updateAttributes({ isExecuting: true, executionResult: undefined, jupyterOutputs: undefined });

    try {
      // Use notebook execution for Python (stateful)
      if (language === 'python') {
        const result = await executeCell(activeNoteId, code);

        updateAttributes({
          jupyterOutputs: result.outputs,
          executionCount: result.execution_count,
          isExecuting: false,
          executionResult: {
            stdout: '',
            stderr: '',
            exitCode: 0,
            executionTime: result.executionTime
          }
        });

        recordOnboardingEvent('code_run', {
          noteId: activeNoteId,
          language,
          exitCode: 0,
          hadError: false,
        });

        toast.success('Code executed successfully', { duration: 4000 });
      } else {
        // Use regular execution for other languages (stateless)
        await autoHealSandbox({ reason: 'code-block-execute' });

        const result = await executionModeManager.getExecutionProvider().executeCode(code, language);

        // Update sandbox status based on execution result
        if (result.sandboxStatus) {
          setSandboxStatus(result.sandboxStatus);
        }

        updateAttributes({ executionResult: result, isExecuting: false });
        recordOnboardingEvent('code_run', {
          noteId: activeNoteId,
          language,
          exitCode: result.exitCode,
          hadError: Boolean(result.error || result.stderr),
        });

        // Show success toast for successful execution
        if (result.exitCode === 0 && !result.error) {
          toast.success('Code executed successfully', { duration: 4000 });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';

      // For Python, create Jupyter error output
      if (language === 'python') {
        const jupyterError: JupyterOutput[] = [{
          output_type: 'error',
          ename: 'ExecutionError',
          evalue: errorMessage,
          traceback: [errorMessage]
        }];

        updateAttributes({
          jupyterOutputs: jupyterError,
          isExecuting: false,
        });
      } else {
        const errorResult: ExecutionResult = {
          stdout: '',
          stderr: errorMessage,
          exitCode: 1,
          error: errorMessage,
          sandboxStatus: 'unhealthy',
          recoverable: true,
        };

        updateAttributes({
          executionResult: errorResult,
          isExecuting: false,
        });

        // Update sandbox status to unhealthy
        setSandboxStatus('unhealthy');
      }

      recordOnboardingEvent('code_run', {
        noteId: activeNoteId,
        language,
        exitCode: 1,
        hadError: true,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Manual restart sandbox handler
  const handleRestartSandbox = async () => {
    toast.loading('Restarting workspace...', { id: 'sandbox-restart' });

    try {
      await recreateSandbox();
      toast.success('Workspace restarted', {
        id: 'sandbox-restart',
        duration: 4000,
      });

      // Clear error state
      updateAttributes({ executionResult: undefined });
    } catch {
      toast.error('Unable to restart. Try toggling cloud execution off and on.', {
        id: 'sandbox-restart',
      });
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAttributes({ language: e.target.value });
  };

  const handleClearOutput = () => {
    updateAttributes({ executionResult: undefined, jupyterOutputs: undefined });
  };

  return (
    <NodeViewWrapper className="executable-code-block not-prose my-8 max-w-4xl mx-auto group" data-type="executable-code-block">
      <div className="border-2 border-stone-300 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-800 transition-all duration-200 hover:border-blue-500 dark:hover:border-blue-500 shadow-code-block">
        {/* Code Block Header - Minimal Icon-Only Design */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-gradient-to-br dark:from-stone-800 dark:via-stone-900 dark:to-black border-b border-stone-200 dark:border-stone-700/50">
          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center gap-2">
              {/* Execution Counter Badge */}
              {language === 'python' && (
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    executionCount
                      ? "text-stone-600 dark:text-stone-300 bg-stone-200/50 dark:bg-stone-700/50"
                      : "text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/50"
                  }`}
                  title={executionCount ? `Execution #${executionCount}` : "Not yet executed"}
                >
                  [{executionCount ?? '·'}]
                </span>
              )}
              <LanguageIcon language={language} size={20} className="text-emerald-400 flex-shrink-0" />
              <select
                value={language}
                onChange={handleLanguageChange}
                className="appearance-none bg-transparent text-stone-600 dark:text-stone-100 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded pr-6 py-1 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                contentEditable={false}
                aria-label="Select programming language"
                title={`Language: ${language}`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-stone-800 text-stone-100">
                    {lang}
                  </option>
                ))}
              </select>
              <svg className="w-3 h-3 text-stone-400 absolute right-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Action Buttons - Icon Only */}
          <div className="flex items-center gap-1.5">
            {/* Copy Code Button */}
            <CopyButton
              text={code}
              size="icon"
              variant="ghost"
              className="text-stone-600 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-600/50"
              aria-label="Copy code"
              title="Copy code"
            />
            {executionResult && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearOutput}
                className="text-stone-600 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-600/50"
                aria-label="Clear output"
                title="Clear output"
              >
                <VscClearAll size={18} aria-hidden="true" />
              </Button>
            )}
            {sandboxStatus === 'unhealthy' && (
              <Button
                variant="danger"
                size="icon"
                onClick={handleRestartSandbox}
                className="bg-amber-600/80 hover:bg-amber-600 text-white hover:text-white"
                aria-label="Restart sandbox"
                title="Restart sandbox"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            )}
            <Button
              variant="primary-subtle"
              onClick={handleExecute}
              disabled={isExecuting || sandboxStatus === 'creating'}
              className="gap-2 hover:shadow-md"
              aria-label={isExecuting ? 'Code is executing' : 'Run code'}
              aria-busy={isExecuting}
              title={isExecuting ? 'Running...' : 'Run code'}
            >
              {isExecuting ? (
                <div className="w-5 h-5 border-2 border-emerald-500 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Code Editor - CodeMirror 6 */}
        <div className="code-editor-container">
          <CodeMirrorEditor
            value={code}
            language={language}
            onChange={handleCodeChange}
            theme={darkModeEnabled ? 'dark' : 'light'}
            readonly={isExecuting}
            className="min-h-[120px]"
            autoFocus
          />
        </div>

        {/* Live Running Indicator */}
        {isExecuting && (
          <div className="border-t border-stone-200 dark:border-stone-700 animate-fadeInSlideUp">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20">
              <div className="flex items-center gap-3">
                {/* Animated dots */}
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Running...
                </span>
                <span className="text-sm font-mono text-stone-600 dark:text-stone-400 tabular-nums">
                  {formatElapsedTime(elapsedTime)}
                </span>
              </div>
              {elapsedTime > 5000 && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {elapsedTime > 30000
                    ? 'Long-running operation (pip install, network requests, etc.)...'
                    : 'This may take a moment...'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Execution Output */}
        {!isExecuting && (jupyterOutputs || executionResult) && (
          <div className="border-t border-stone-200 dark:border-stone-700 animate-fadeInSlideUp">
            {/* Jupyter Outputs (for Python) */}
            {language === 'python' && jupyterOutputs && (
              <div className="px-5 py-4">
                <NotebookOutput outputs={jupyterOutputs} />
              </div>
            )}

            {/* Legacy outputs (for other languages) */}
            {language !== 'python' && executionResult && (
              <>
                {/* Stdout */}
                {executionResult.stdout && (
                  <div className="output-section group/output relative px-5 py-4 bg-white dark:bg-stone-800 border-b border-stone-100 dark:border-stone-700">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Output
                    </div>
                    <CopyButton
                      text={executionResult.stdout}
                      size="sm"
                      variant="icon-only"
                      className="output-copy-btn absolute top-3 right-3 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                      aria-label="Copy output"
                      title="Copy output"
                    />
                    <pre className="code-output text-base font-mono text-stone-800 dark:text-stone-200 whitespace-pre-wrap bg-stone-50 dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-700 max-h-[400px] overflow-y-auto">
                      {executionResult.stdout}
                    </pre>
                  </div>
                )}

                {/* Stderr */}
                {executionResult.stderr && (
                  <div className="output-section group/output relative px-5 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                      </svg>
                      Error Output
                    </div>
                    <CopyButton
                      text={executionResult.stderr}
                      size="sm"
                      variant="icon-only"
                      className="output-copy-btn absolute top-3 right-3 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                      aria-label="Copy error output"
                      title="Copy error output"
                    />
                    <pre className="code-output text-base font-mono text-red-800 dark:text-red-300 whitespace-pre-wrap bg-white dark:bg-stone-900 p-4 rounded-lg border border-red-200 dark:border-red-900/30 max-h-[300px] overflow-y-auto">
                      {executionResult.stderr}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {executionResult.error && (
                  <div className="output-section group/output relative px-5 py-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
                    <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Error
                    </div>
                    <CopyButton
                      text={executionResult.error}
                      size="sm"
                      variant="icon-only"
                      className="output-copy-btn absolute top-3 right-3 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                      aria-label="Copy error"
                      title="Copy error"
                    />
                    <pre className="code-output text-base font-mono text-red-800 dark:text-red-300 whitespace-pre-wrap bg-white dark:bg-stone-900 p-4 rounded-lg border border-red-200 dark:border-red-900/30 max-h-[300px] overflow-y-auto">
                      {executionResult.error}
                    </pre>
                  </div>
                )}

                {/* Rich Outputs (images, charts) */}
                {executionResult.richOutputs && executionResult.richOutputs.length > 0 && (
                  <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                      Rich Output
                    </div>
                    {executionResult.richOutputs.map((output, idx) => (
                      <div key={idx} className="mb-4">
                        {output.type === 'image/png' || output.type === 'image/jpeg' ? (
                          <img
                            src={`data:${output.type};base64,${output.data}`}
                            alt={`Output ${idx}`}
                            className="max-w-full h-auto rounded-lg border border-stone-200 shadow-md"
                          />
                        ) : (
                          <pre className="code-output text-base font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap bg-stone-50 dark:bg-stone-900 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                            {output.data}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Execution Time */}
            {executionResult && executionResult.executionTime !== undefined && (
              <div className="px-5 py-3 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                Executed in {executionResult.executionTime}ms
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
