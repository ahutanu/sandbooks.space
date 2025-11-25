/**
 * Docs Update Notification Component
 *
 * Shows a notification when built-in documentation has been updated.
 * Allows users to update system docs without losing their personal notes.
 *
 * Design Principles:
 * - Clear: Explains what will happen (docs updated, personal notes preserved)
 * - Actionable: Two clear choices - Update or Dismiss
 * - Non-blocking: Positioned to not obstruct main content
 */

import { useNotesStore } from '../../store/notesStore';
import { DOCS_VERSION, DOCS_UPDATED_AT, SYSTEM_DOC_TITLES } from '../../utils/defaultDocumentation';
import type { Note } from '../../types';

// Helper to identify system docs (by flag or well-known title for backward compat)
const isSystemDoc = (note: Note): boolean => {
  if (note.isSystemDoc) return true;
  return SYSTEM_DOC_TITLES.includes(note.title as typeof SYSTEM_DOC_TITLES[number]);
};

export const DocsUpdateNotification = () => {
  const { docsUpdateAvailable, updateSystemDocs, dismissDocsUpdate, notes } = useNotesStore();

  // Only show when update is available
  if (!docsUpdateAvailable) {
    return null;
  }

  // Count user notes (non-system docs)
  const userNotesCount = notes.filter((note) => !isSystemDoc(note)).length;

  return (
    <div className="fixed top-20 right-6 z-40 animate-fadeIn max-w-sm">
      <div className="glass-modal rounded-xl shadow-elevation-2 border border-blue-200/30 dark:border-blue-700/30 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-blue-500/10 dark:bg-blue-500/5 border-b border-blue-200/20 dark:border-blue-700/20">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Documentation Update Available
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            A new version of the built-in guides is available (v{DOCS_VERSION}, {DOCS_UPDATED_AT}).
          </p>

          {userNotesCount > 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-500 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Your {userNotesCount} personal note{userNotesCount !== 1 ? 's' : ''} will be preserved
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={updateSystemDocs}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
            >
              Update Guides
            </button>
            <button
              onClick={dismissDocsUpdate}
              className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
