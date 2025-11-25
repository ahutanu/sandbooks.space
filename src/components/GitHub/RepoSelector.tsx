import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { gitHubService } from '../../services/github';
import { showToast as toast } from '../../utils/toast';
import type { GitHubRepo } from '../../types/github.types';
import clsx from 'clsx';
import {
  LuSearch,
  LuLoader,
  LuLock,
  LuGlobe,
  LuPlus,
  LuX,
  LuCheck,
  LuFolderGit2,
  LuCircleAlert,
} from 'react-icons/lu';

export const RepoSelector = () => {
  const { isRepoSelectorOpen, setRepoSelectorOpen, selectGitHubRepo, gitHubRepo, gitHubUser } =
    useNotesStore();

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRepoName, setNewRepoName] = useState('sandbooks-notes');
  const [isSelectingRepo, setIsSelectingRepo] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Load repos when modal opens
  useEffect(() => {
    if (isRepoSelectorOpen) {
      previousActiveElement.current = document.activeElement;
      loadRepos();
      // Focus search input after animation
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isRepoSelectorOpen]);

  const loadRepos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const repoList = await gitHubService.listRepos();
      setRepos(repoList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setRepoSelectorOpen(false);
    setSearchQuery('');
    setIsCreatingNew(false);
    setNewRepoName('sandbooks-notes');
    // Restore focus
    if (previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [setRepoSelectorOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRepoSelectorOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isRepoSelectorOpen]);

  // Focus trap
  useEffect(() => {
    if (!isRepoSelectorOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [isRepoSelectorOpen]);

  const handleSelectRepo = async (repoFullName: string) => {
    setIsSelectingRepo(repoFullName);
    try {
      await selectGitHubRepo(repoFullName);
      toast.success(`Selected ${repoFullName}`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to select repository');
    } finally {
      setIsSelectingRepo(null);
    }
  };

  const handleCreateAndSelect = async () => {
    if (!newRepoName.trim() || !gitHubUser) return;

    const repoFullName = `${gitHubUser.login}/${newRepoName.trim()}`;
    setIsSelectingRepo(repoFullName);
    try {
      await selectGitHubRepo(repoFullName, true);
      toast.success(`Created and selected ${repoFullName}`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setIsSelectingRepo(null);
    }
  };

  // Filter repos by search query
  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isRepoSelectorOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-selector-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 w-full max-w-lg mx-4 shadow-elevation-4 animate-scaleIn overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <LuFolderGit2 className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <h3
              id="repo-selector-title"
              className="text-lg font-bold text-stone-900 dark:text-stone-50 tracking-tight"
            >
              Select Repository
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-50 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LuLoader className="w-8 h-8 animate-spin text-stone-400" />
              <p className="mt-3 text-sm text-stone-500">Loading repositories...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-5">
              <LuCircleAlert className="w-8 h-8 text-red-500" />
              <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              <button
                onClick={loadRepos}
                className="mt-4 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="py-2">
              {/* Create new repo option */}
              {!isCreatingNew ? (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-5 py-3',
                    'text-left text-sm font-medium',
                    'text-blue-600 dark:text-blue-400',
                    'hover:bg-blue-50 dark:hover:bg-blue-900/20',
                    'transition-colors duration-150'
                  )}
                >
                  <LuPlus className="w-4 h-4" />
                  <span>Create new repository</span>
                </button>
              ) : (
                <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                    New Repository Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                      placeholder="sandbooks-notes"
                      className="flex-1 px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateAndSelect}
                      disabled={!newRepoName.trim() || isSelectingRepo !== null}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSelectingRepo ? (
                        <LuLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create'
                      )}
                    </button>
                    <button
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {gitHubUser && (
                    <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                      <LuLock className="inline w-3 h-3 mr-1 -mt-0.5" />
                      Private repo: {gitHubUser.login}/{newRepoName || 'sandbooks-notes'}
                    </p>
                  )}
                </div>
              )}

              {/* Repo list */}
              {filteredRepos.length > 0 ? (
                <div className="mt-1">
                  {filteredRepos.map((repo) => {
                    const isSelected = gitHubRepo === repo.fullName;
                    const isSelecting = isSelectingRepo === repo.fullName;

                    return (
                      <button
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo.fullName)}
                        disabled={isSelectingRepo !== null}
                        className={clsx(
                          'w-full flex items-center gap-3 px-5 py-3',
                          'text-left text-sm',
                          'hover:bg-stone-100 dark:hover:bg-stone-800',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'transition-colors duration-150',
                          isSelected && 'bg-stone-100 dark:bg-stone-800'
                        )}
                      >
                        <div className="flex-shrink-0">
                          {repo.private ? (
                            <LuLock className="w-4 h-4 text-stone-400" />
                          ) : (
                            <LuGlobe className="w-4 h-4 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-stone-900 dark:text-stone-100 truncate block">
                            {repo.name}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400 truncate block">
                            {repo.fullName}
                          </span>
                        </div>
                        {isSelecting ? (
                          <LuLoader className="w-4 h-4 animate-spin text-blue-500" />
                        ) : isSelected ? (
                          <LuCheck className="w-4 h-4 text-green-500" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    No repositories matching "{searchQuery}"
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
