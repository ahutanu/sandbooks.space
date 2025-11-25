import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
import {
  enhancedExecutionVariants,
  executionCountVariants,
} from '../../utils/animationVariants';

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
  const [executionFeedback, setExecutionFeedback] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [countAnimationKey, setCountAnimationKey] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const prevCountRef = useRef<number | undefined>(undefined);
  const language = (node.attrs.language as Language) || 'python';

  // Extract node attributes
  const executionResult = node.attrs.executionResult as ExecutionResult | undefined;
  const executionCount = node.attrs.executionCount as number | undefined;
  const jupyterOutputs = node.attrs.jupyterOutputs as JupyterOutput[] | undefined;

  // Backward compatibility: Try attrs.code first, fallback to textContent
  const code = (node.attrs.code as string) || node.textContent || '';

  // Reset feedback after animation completes
  useEffect(() => {
    if (executionFeedback === 'success' || executionFeedback === 'error') {
      const timer = setTimeout(() => setExecutionFeedback('idle'), 600);
      return () => clearTimeout(timer);
    }
  }, [executionFeedback]);

  // Trigger count badge animation when execution count changes
  useEffect(() => {
    if (executionCount !== undefined && executionCount !== prevCountRef.current) {
      setCountAnimationKey((k) => k + 1);
      prevCountRef.current = executionCount;
    }
  }, [executionCount]);

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
    setExecutionFeedback('running');
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

        setExecutionFeedback('success');
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
          setExecutionFeedback('success');
          toast.success('Code executed successfully', { duration: 4000 });
        } else {
          setExecutionFeedback('error');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';

      // Detect common error types for better messaging
      const isServerError = errorMessage.includes('500') || errorMessage.includes('Internal Server');
      const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');

      let userFriendlyMessage = errorMessage;
      if (isServerError) {
        userFriendlyMessage = 'Server temporarily unavailable. The sandbox may be initializing - please try again in a moment.';
      } else if (isNetworkError) {
        userFriendlyMessage = 'Network error. Check your connection and try again.';
      } else if (isTimeoutError) {
        userFriendlyMessage = 'Execution timed out. Try breaking your code into smaller parts.';
      }

      // For Python, create Jupyter error output
      if (language === 'python') {
        const jupyterError: JupyterOutput[] = [{
          output_type: 'error',
          ename: isServerError ? 'ServerError' : isNetworkError ? 'NetworkError' : isTimeoutError ? 'TimeoutError' : 'ExecutionError',
          evalue: userFriendlyMessage,
          traceback: [userFriendlyMessage]
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

      setExecutionFeedback('error');
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
      <m.div
        className="relative rounded-xl overflow-hidden glass-surface transition-shadow duration-moderate hover:shadow-elevation-3"
        variants={enhancedExecutionVariants}
        initial="idle"
        animate={executionFeedback}
      >
        {/* Inner glow overlay for glass depth */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-transparent to-transparent dark:from-white/5 pointer-events-none" aria-hidden="true" />

        {/* Code Block Header */}
        <div className="relative flex items-center justify-between px-4 py-2.5 bg-stone-50/80 dark:bg-stone-800/80 border-b border-stone-200/50 dark:border-stone-700/50">
          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center gap-2">
              {/* Execution Counter Badge with pop animation */}
              {language === 'python' && (
                <AnimatePresence mode="wait">
                  <m.span
                    key={countAnimationKey}
                    variants={executionCountVariants}
                    initial="initial"
                    animate={countAnimationKey > 0 ? "update" : "initial"}
                    className={`text-xs font-mono px-2 py-0.5 rounded ${
                      executionCount
                        ? "text-stone-600 dark:text-stone-300 bg-stone-200/50 dark:bg-stone-700/50"
                        : "text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/50"
                    }`}
                    title={executionCount ? `Execution #${executionCount}` : "Not yet executed"}
                  >
                    [{executionCount ?? '·'}]
                  </m.span>
                </AnimatePresence>
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
              variant="default"
              onClick={handleExecute}
              disabled={isExecuting || sandboxStatus === 'creating'}
              className="gap-2 px-3 py-1.5 !bg-emerald-600 hover:!bg-emerald-500 !text-white shadow-sm hover:shadow-md transition-all duration-200"
              aria-label={isExecuting ? 'Code is executing' : 'Run code'}
              aria-busy={isExecuting}
              title={isExecuting ? 'Running...' : 'Run code (⌘+Enter)'}
            >
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">Run</span>
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
          <div className="relative border-t border-stone-200/50 dark:border-stone-700/50 animate-fadeInSlideUp">
            <div className="px-5 py-4 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {/* Animated dots */}
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Running...
                </span>
                <span className="text-sm font-mono text-stone-500 dark:text-stone-400 tabular-nums">
                  {formatElapsedTime(elapsedTime)}
                </span>
              </div>
              {elapsedTime > 5000 && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {elapsedTime > 30000
                    ? 'Long-running operation...'
                    : 'This may take a moment...'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Execution Output */}
        {!isExecuting && (jupyterOutputs || executionResult) && (
          <div className="relative border-t border-stone-200/50 dark:border-stone-700/50 animate-fadeInSlideUp">
            {/* Jupyter Outputs (for Python) */}
            {language === 'python' && jupyterOutputs && (
              <div className="relative px-5 py-4 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm">
                <NotebookOutput outputs={jupyterOutputs} />
              </div>
            )}

            {/* Legacy outputs (for other languages) */}
            {language !== 'python' && executionResult && (
              <>
                {/* Stdout */}
                {executionResult.stdout && (
                  <div className="output-section group/output relative px-5 py-4 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-b border-stone-200/50 dark:border-stone-700/50">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
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
                    <pre className="code-output text-sm font-mono text-stone-800 dark:text-stone-200 whitespace-pre-wrap bg-stone-50/80 dark:bg-stone-900/80 p-3 rounded-lg border border-stone-200/50 dark:border-stone-700/50 max-h-[400px] overflow-y-auto">
                      {executionResult.stdout}
                    </pre>
                  </div>
                )}

                {/* Error Output - Consolidated (show stderr or error, avoiding duplicates) */}
                {(executionResult.stderr || executionResult.error) && (() => {
                  // Prefer stderr if available, otherwise use error
                  // Only show error separately if it's different from stderr
                  const errorText = executionResult.stderr || executionResult.error || '';
                  const hasDistinctError = executionResult.error && executionResult.stderr &&
                    executionResult.error !== executionResult.stderr;

                  return (
                    <div className="output-section group/output relative px-5 py-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-t border-red-200/50 dark:border-red-900/30">
                      <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Error
                      </div>
                      <CopyButton
                        text={hasDistinctError ? `${executionResult.stderr}\n\n${executionResult.error}` : errorText}
                        size="sm"
                        variant="icon-only"
                        className="output-copy-btn absolute top-3 right-3 opacity-0 group-hover/output:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
                        aria-label="Copy error"
                        title="Copy error"
                      />
                      <pre className="code-output text-sm font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap bg-white/80 dark:bg-stone-900/80 p-3 rounded-lg border border-red-200/50 dark:border-red-900/30 max-h-[300px] overflow-y-auto">
                        {errorText}
                        {hasDistinctError && (
                          <>
                            {'\n\n--- Additional Error Info ---\n\n'}
                            {executionResult.error}
                          </>
                        )}
                      </pre>
                    </div>
                  );
                })()}

                {/* Rich Outputs (images, charts) */}
                {executionResult.richOutputs && executionResult.richOutputs.length > 0 && (
                  <div className="px-5 py-4 border-t border-stone-200/50 dark:border-stone-700/50 bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm">
                    <div className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-4 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                      Rich Output
                    </div>
                    {executionResult.richOutputs.map((output, idx) => (
                      <div key={idx} className="mb-4 last:mb-0">
                        {output.type === 'image/png' || output.type === 'image/jpeg' ? (
                          <img
                            src={`data:${output.type};base64,${output.data}`}
                            alt={`Output ${idx}`}
                            className="max-w-full h-auto rounded-lg border border-stone-200/50 dark:border-stone-700/50 shadow-sm"
                          />
                        ) : (
                          <pre className="code-output text-sm font-mono text-stone-700 dark:text-stone-300 whitespace-pre-wrap bg-stone-50/80 dark:bg-stone-900/80 p-3 rounded-lg border border-stone-200/50 dark:border-stone-700/50">
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
              <div className="relative px-5 py-2.5 bg-stone-50/80 dark:bg-stone-800/80 backdrop-blur-sm border-t border-stone-200/50 dark:border-stone-700/50 text-xs text-stone-500 dark:text-stone-400 font-medium flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {executionResult.executionTime}ms
              </div>
            )}
          </div>
        )}
      </m.div>
    </NodeViewWrapper>
  );
};
