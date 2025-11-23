/**
 * Offline Indicator Component
 *
 * Shows a subtle indicator when the app is offline, including queued requests count.
 */

import { useNotesStore } from '../../store/notesStore';

export const OfflineIndicator = () => {
  const { isOnline, offlineQueue } = useNotesStore();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  const queueCount = offlineQueue.length;

  return (
    <div className="fixed top-20 right-6 z-40 animate-fadeIn">
      <div className="glass-modal rounded-xl px-4 py-2.5 shadow-elevation-2 border border-stone-200/20 dark:border-stone-700/20 flex items-center gap-2.5">
        <div className="flex-shrink-0">
          <svg
            className="w-4 h-4 text-stone-600 dark:text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Offline
          </span>
          {queueCount > 0 && (
            <span className="text-xs text-stone-500 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
              {queueCount} queued
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

