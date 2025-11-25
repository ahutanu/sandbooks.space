import { useCallback, useMemo } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { encodePayload, createPayloadUrl } from '../../utils/payload';
import { showToast as toast } from '../../utils/toast';
import type { Note, PayloadMetadata } from '../../types';

interface PayloadViewerBannerProps {
  note: Note;
  metadata: PayloadMetadata;
}

/**
 * Banner shown when viewing a note loaded from a payload link.
 * Provides actions to save the note or copy the link.
 */
export const PayloadViewerBanner = ({ note, metadata }: PayloadViewerBannerProps) => {
  const { savePayloadToNotes, clearPayload } = useNotesStore();

  // Copy the share link again
  const handleCopyLink = useCallback(async () => {
    try {
      const result = encodePayload(note);
      const url = createPayloadUrl(result.token);
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [note]);

  // Save the note to the collection
  const handleSave = useCallback(() => {
    const savedNote = savePayloadToNotes();
    if (savedNote) {
      // Clear the URL hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [savePayloadToNotes]);

  // Go back to notes list
  const handleGoBack = useCallback(() => {
    clearPayload();
    window.history.replaceState(null, '', window.location.pathname);
  }, [clearPayload]);

  // Format expiry date
  const expiryText = useMemo(() => {
    if (!metadata.expiresAt) return null;
    const now = new Date();
    const expiry = metadata.expiresAt;
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Expires soon';
  }, [metadata.expiresAt]);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Viewing shared note
              </p>
              {expiryText && (
                <p className="text-xs text-blue-600 dark:text-blue-400">{expiryText}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Link
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save to My Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading state for payload decoding
 */
export const PayloadLoading = () => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-stone-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 mx-auto border-3 border-stone-200 dark:border-stone-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
          Opening shared note...
        </p>
      </div>
    </div>
  );
};
