import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { showToast as toast } from '../../utils/toast';
import {
  encodePayload,
  createPayloadUrl,
  PayloadTooLargeError,
  type EncodeResult,
} from '../../utils/payload';
import type { Note } from '../../types';

interface ShareModalProps {
  note: Note;
  onClose: () => void;
}

type ExpiryOption = {
  label: string;
  value: number | null; // null = no expiry, number = seconds
};

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'Never', value: null },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
];

export const ShareModal = ({ note, onClose }: ShareModalProps) => {
  const [expiryIndex, setExpiryIndex] = useState(0);
  const [encodeResult, setEncodeResult] = useState<EncodeResult | null>(null);
  const [error, setError] = useState<{ message: string; suggestions: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const { setShareModalOpen } = useNotesStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle close - defined early so it can be used in effects
  const handleClose = useCallback(() => {
    setShareModalOpen(false);
    onClose();
  }, [onClose, setShareModalOpen]);

  // Generate the share link whenever expiry changes
  const generateLink = useCallback(() => {
    try {
      setError(null);
      const expiry = EXPIRY_OPTIONS[expiryIndex].value;
      const result = encodePayload(note, expiry ? { expiresIn: expiry } : undefined);
      setEncodeResult(result);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        setError({
          message: 'This note is too large to share as a link.',
          suggestions: err.suggestions,
        });
      } else {
        setError({
          message: 'Failed to generate share link. Please try again.',
          suggestions: [],
        });
      }
      setEncodeResult(null);
    }
  }, [note, expiryIndex]);

  // Generate link on mount and when expiry changes
  useEffect(() => {
    generateLink();
  }, [generateLink]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Focus trap and restore focus on close
  useEffect(() => {
    previousActiveElement.current = document.activeElement;

    // Focus the first focusable element in the modal
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Trap focus within modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus to previous element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Build full URL
  const shareUrl = useMemo(() => {
    if (!encodeResult) return '';
    return createPayloadUrl(encodeResult.token);
  }, [encodeResult]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

  // Count content stats
  const contentStats = useMemo(() => {
    const content = note.content?.content || [];
    let codeBlocks = 0;
    let paragraphs = 0;

    const countNodes = (nodes: unknown[]) => {
      for (const node of nodes) {
        const n = node as { type?: string; content?: unknown[] };
        if (n.type === 'executableCodeBlock' || n.type === 'codeBlock') {
          codeBlocks++;
        } else if (n.type === 'paragraph') {
          paragraphs++;
        }
        if (n.content) {
          countNodes(n.content);
        }
      }
    };

    countNodes(content);
    return { codeBlocks, paragraphs };
  }, [note]);

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 max-w-lg w-full mx-4 shadow-elevation-4 animate-scaleIn"
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            id="share-modal-title"
            className="text-lg font-bold text-stone-900 dark:text-stone-50 tracking-tight"
          >
            Share Note
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error ? (
          // Error state
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {error.message}
                  </p>
                  {encodeResult && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Current size: ~{Math.round(encodeResult.stats.tokenLength / 100) / 10}KB
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Suggestions
                </p>
                <ul className="space-y-1.5">
                  {error.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <span className="w-1 h-1 bg-stone-400 rounded-full" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          // Success state
          <div className="space-y-5">
            {/* Link Preview */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2.5 text-sm font-mono border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 truncate"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expiry Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Link Expires
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRY_OPTIONS.map((option, i) => (
                  <button
                    key={option.label}
                    onClick={() => setExpiryIndex(i)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      expiryIndex === i
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="space-y-1.5">
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    This link contains the entire note. No account or sign-in required to view.
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    Code outputs are not included—recipients can run the code themselves.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            {encodeResult && (
              <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-500">
                <span>{contentStats.paragraphs} paragraphs</span>
                <span className="w-1 h-1 bg-stone-300 dark:bg-stone-600 rounded-full" />
                <span>{contentStats.codeBlocks} code blocks</span>
                <span className="w-1 h-1 bg-stone-300 dark:bg-stone-600 rounded-full" />
                <span>{encodeResult.stats.tokenLength} chars</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
