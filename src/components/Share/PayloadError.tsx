import { useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import type { PayloadErrorInfo } from '../../types';

interface PayloadErrorProps {
  error: PayloadErrorInfo;
}

/**
 * Error display for failed payload decoding.
 * Shows appropriate error message and navigation options.
 */
export const PayloadError = ({ error }: PayloadErrorProps) => {
  const { clearPayload } = useNotesStore();

  const handleGoToNotes = useCallback(() => {
    clearPayload();
    window.history.replaceState(null, '', window.location.pathname);
  }, [clearPayload]);

  // Get icon based on error type
  const getIcon = () => {
    switch (error.type) {
      case 'expired':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'version':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case 'corrupted':
      default:
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  // Get title based on error type
  const getTitle = () => {
    switch (error.type) {
      case 'expired':
        return 'Link Expired';
      case 'version':
        return 'Incompatible Version';
      case 'corrupted':
        return 'Invalid Link';
      default:
        return 'Could Not Open';
    }
  };

  // Get helpful tip based on error type
  const getTip = () => {
    switch (error.type) {
      case 'expired':
        return 'Ask the sender to create a new share link.';
      case 'version':
        return 'Try refreshing the page to get the latest version.';
      case 'corrupted':
        return 'The link may have been truncated when shared. Ask the sender for a new link.';
      default:
        return null;
    }
  };

  const tip = getTip();

  return (
    <div className="fixed inset-0 bg-white dark:bg-stone-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-400 dark:text-stone-500">
          {getIcon()}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
          {getTitle()}
        </h1>

        {/* Message */}
        <p className="text-stone-600 dark:text-stone-400">{error.message}</p>

        {/* Tip */}
        {tip && (
          <p className="text-sm text-stone-500 dark:text-stone-500 bg-stone-50 dark:bg-stone-900 px-4 py-3 rounded-lg">
            {tip}
          </p>
        )}

        {/* Action */}
        <button
          onClick={handleGoToNotes}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go to My Notes
        </button>
      </div>
    </div>
  );
};
