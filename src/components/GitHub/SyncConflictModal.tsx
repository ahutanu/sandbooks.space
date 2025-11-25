import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { showToast as toast } from '../../utils/toast';
import type { SyncConflictStrategy } from '../../types/github.types';
import clsx from 'clsx';
import {
  LuTriangleAlert,
  LuGitMerge,
  LuCloud,
  LuHardDrive,
  LuLoader,
  LuX,
  LuArrowRight,
} from 'react-icons/lu';

interface StrategyOption {
  id: SyncConflictStrategy;
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
}

const STRATEGIES: StrategyOption[] = [
  {
    id: 'merge',
    icon: <LuGitMerge className="w-5 h-5" />,
    title: 'Merge Both',
    description: 'Keep notes from both local and GitHub',
    detail: 'Local notes will be preserved. GitHub notes will be added. Duplicates by ID will use the most recently updated version.',
  },
  {
    id: 'github',
    icon: <LuCloud className="w-5 h-5" />,
    title: 'Use GitHub',
    description: 'Replace local notes with GitHub notes',
    detail: 'All local notes will be replaced with the notes from GitHub. This cannot be undone.',
  },
  {
    id: 'local',
    icon: <LuHardDrive className="w-5 h-5" />,
    title: 'Use Local',
    description: 'Push local notes to GitHub',
    detail: 'Your local notes will overwrite the notes on GitHub. This cannot be undone.',
  },
];

export const SyncConflictModal = () => {
  const { isSyncConflictModalOpen, setSyncConflictModalOpen, resolveInitialSyncConflict, notes, gitHubRepo } =
    useNotesStore();

  const [selectedStrategy, setSelectedStrategy] = useState<SyncConflictStrategy>('merge');
  const [isResolving, setIsResolving] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Focus management
  useEffect(() => {
    if (isSyncConflictModalOpen) {
      previousActiveElement.current = document.activeElement;
      // Focus the first strategy option after animation
      setTimeout(() => {
        const firstButton = modalRef.current?.querySelector<HTMLButtonElement>('[role="radio"]');
        firstButton?.focus();
      }, 100);
    }
  }, [isSyncConflictModalOpen]);

  const handleClose = useCallback(() => {
    setSyncConflictModalOpen(false);
    // Restore focus
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [setSyncConflictModalOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSyncConflictModalOpen && !isResolving) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isSyncConflictModalOpen, isResolving]);

  // Focus trap
  useEffect(() => {
    if (!isSyncConflictModalOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isSyncConflictModalOpen]);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await resolveInitialSyncConflict(selectedStrategy);
      toast.success('Sync conflict resolved');
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  };

  if (!isSyncConflictModalOpen) return null;

  const selectedOption = STRATEGIES.find((s) => s.id === selectedStrategy);

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isResolving) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-conflict-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 w-full max-w-lg mx-4 shadow-elevation-4 animate-scaleIn overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
              <LuTriangleAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3
                id="sync-conflict-title"
                className="text-lg font-bold text-stone-900 dark:text-stone-50 tracking-tight"
              >
                Initial Sync Required
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                Both local and GitHub have notes. Choose how to proceed.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isResolving}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Context info */}
          <div className="flex items-center justify-between text-sm text-stone-600 dark:text-stone-400 mb-4 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <LuHardDrive className="w-4 h-4" />
              <span>{notes.length} local notes</span>
            </div>
            <LuArrowRight className="w-4 h-4 text-stone-400" />
            <div className="flex items-center gap-2">
              <LuCloud className="w-4 h-4" />
              <span className="truncate max-w-32">{gitHubRepo}</span>
            </div>
          </div>

          {/* Strategy selector */}
          <div
            role="radiogroup"
            aria-label="Sync strategy"
            className="space-y-2"
          >
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                role="radio"
                aria-checked={selectedStrategy === strategy.id}
                onClick={() => setSelectedStrategy(strategy.id)}
                disabled={isResolving}
                className={clsx(
                  'w-full flex items-start gap-4 p-4 rounded-lg',
                  'text-left transition-all duration-150',
                  'border-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  selectedStrategy === strategy.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                )}
              >
                <div
                  className={clsx(
                    'p-2 rounded-lg',
                    selectedStrategy === strategy.id
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  )}
                >
                  {strategy.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={clsx(
                      'font-semibold block',
                      selectedStrategy === strategy.id
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-stone-900 dark:text-stone-100'
                    )}
                  >
                    {strategy.title}
                  </span>
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    {strategy.description}
                  </span>
                </div>
                <div
                  className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    selectedStrategy === strategy.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-stone-300 dark:border-stone-600'
                  )}
                >
                  {selectedStrategy === strategy.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Selected strategy detail */}
          {selectedOption && (
            <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {selectedOption.detail}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <button
            onClick={handleClose}
            disabled={isResolving}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-blue-600 text-white hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              'flex items-center gap-2'
            )}
          >
            {isResolving ? (
              <>
                <LuLoader className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span>Continue with {selectedOption?.title}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
